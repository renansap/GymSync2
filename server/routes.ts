import type { Express, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { isAuthenticated } from "./auth";
import { AuthenticatedRequest } from "./types";
import { generateWorkout } from "./aiService";
import { emailService } from "./emailService";
import { insertWorkoutSchema, insertWorkoutSessionSchema, loginSchema, passwordResetSchema, insertEmailTemplateSchema, gymMembers } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { passwordResetLimiter, aiLimiter } from './middleware/rateLimiter';

// Function to ensure default email templates exist
async function ensureDefaultEmailTemplates() {
  const defaultTemplates = [
    {
      userType: 'aluno',
      templateType: 'welcome',
      subject: 'Bem-vindo ao GymSync, {{nome}}!',
      content: `
        <h2>Bem-vindo ao GymSync!</h2>
        <p>Olá {{nome}},</p>
        <p>Parabéns! Sua conta de aluno foi criada com sucesso no GymSync.</p>
        <p>Você agora tem acesso à nossa plataforma de treinos personalizados com inteligência artificial.</p>
        <p><strong>Suas credenciais:</strong></p>
        <ul>
          <li>Email: {{email}}</li>
          <li>Tipo de conta: {{tipo}}</li>
        </ul>
        <p>Para definir sua senha e começar a usar o sistema, clique no link abaixo:</p>
        <p><a href="{{link_senha}}" class="button">Definir Minha Senha</a></p>
        <p>Com o GymSync, você terá:</p>
        <ul>
          <li>🏋️ Treinos personalizados com IA</li>
          <li>📊 Acompanhamento de progresso</li>
          <li>🎯 Metas e objetivos</li>
          <li>📱 Acesso via app e web</li>
        </ul>
        <p>Estamos ansiosos para ver sua jornada fitness começar!</p>
      `
    },
    {
      userType: 'personal',
      templateType: 'welcome',
      subject: 'Bem-vindo à equipe GymSync, {{nome}}!',
      content: `
        <h2>Bem-vindo à nossa equipe!</h2>
        <p>Olá {{nome}},</p>
        <p>É com grande prazer que te damos as boas-vindas como Personal Trainer no GymSync!</p>
        <p>Sua conta foi criada com sucesso e você agora faz parte da nossa comunidade de profissionais fitness.</p>
        <p><strong>Suas credenciais:</strong></p>
        <ul>
          <li>Email: {{email}}</li>
          <li>Tipo de conta: {{tipo}}</li>
        </ul>
        <p>Para definir sua senha e acessar o painel do personal trainer, clique no link abaixo:</p>
        <p><a href="{{link_senha}}" class="button">Definir Minha Senha</a></p>
        <p>Como Personal Trainer no GymSync, você terá acesso a:</p>
        <ul>
          <li>👥 Gestão de alunos</li>
          <li>📋 Criação de treinos personalizados</li>
          <li>📈 Relatórios de progresso</li>
          <li>🤖 Ferramentas com IA</li>
          <li>📊 Dashboard analítico</li>
        </ul>
        <p>Estamos empolgados para trabalhar com você!</p>
      `
    },
    {
      userType: 'academia',
      templateType: 'welcome',
      subject: 'Sua academia está ativa no GymSync!',
      content: `
        <h2>Academia cadastrada com sucesso!</h2>
        <p>Olá,</p>
        <p>Parabéns! Sua academia foi cadastrada com sucesso no GymSync.</p>
        <p>Você agora tem acesso à nossa plataforma multi-tenant para gestão completa da sua academia.</p>
        <p><strong>Suas credenciais de administrador:</strong></p>
        <ul>
          <li>Email: {{email}}</li>
          <li>Tipo de conta: {{tipo}}</li>
        </ul>
        <p>Para definir sua senha e acessar o painel administrativo, clique no link abaixo:</p>
        <p><a href="{{link_senha}}" class="button">Acessar Painel da Academia</a></p>
        <p>Com o GymSync, sua academia terá:</p>
        <ul>
          <li>🏢 Gestão multi-tenant</li>
          <li>👥 Controle de alunos e personal trainers</li>
          <li>📊 Dashboard com métricas em tempo real</li>
          <li>💰 Gestão financeira</li>
          <li>📱 Aplicativo para seus clientes</li>
          <li>🤖 Inteligência artificial integrada</li>
        </ul>
        <p>Bem-vindo à revolução fitness!</p>
      `
    }
  ];

  for (const template of defaultTemplates) {
    try {
      const existing = await storage.getEmailTemplateByType(template.userType, template.templateType);
      if (!existing) {
        await storage.createEmailTemplate({
          ...template,
          isActive: true
        });
        console.log(`✅ Created default email template: ${template.userType}/${template.templateType}`);
      }
    } catch (error) {
      console.error(`Failed to create default template ${template.userType}/${template.templateType}:`, error);
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Smart redirect route based on user type
  app.get('/api/auth/redirect', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      console.log('🔍 Redirect route accessed');
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      console.log('👤 User ID:', userId);
      
      // Verificar se há dados de login na sessão
      const sessionLoginData = (req.session as any)?.loginData;
      console.log('📧 Session login data:', sessionLoginData);
      
      const user = await storage.getUser(userId);
      console.log('👤 User data:', user);
      
      // Redirect based on user type (priorizar dados da sessão)
      let redirectUrl = '/';
      let userType = user?.userType;
      
      // Se há dados da sessão, usar o tipo selecionado pelo usuário
      if (sessionLoginData?.userType && typeof sessionLoginData.userType === 'string') {
        userType = sessionLoginData.userType;
        console.log('🎯 Using user type from session:', userType);
      }
      
      if (userType === 'aluno') {
        redirectUrl = '/aluno';
        console.log('🎯 Redirecting aluno to:', redirectUrl);
      } else if (userType === 'personal') {
        redirectUrl = '/personal';
        console.log('🎯 Redirecting personal to:', redirectUrl);
      } else if (userType === 'academia') {
        redirectUrl = '/hub-academia';
        console.log('🎯 Redirecting academia to:', redirectUrl);
      } else if (userType === 'admin') {
        redirectUrl = '/hub-academia';
        console.log('🎯 Redirecting admin to:', redirectUrl);
      } else {
        console.log('🎯 No user type found, redirecting to home');
        redirectUrl = '/';
      }
      
      // Limpar dados da sessão após uso
      if ((req.session as any)?.loginData) {
        delete (req.session as any).loginData;
        console.log('🧹 Session login data cleared');
      }
      
      console.log('🚀 Final redirect URL:', redirectUrl);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error("❌ Error in smart redirect:", error);
      // Fallback to home page if there's an error
      res.redirect('/');
    }
  });

  // AI Workout Generation
  app.post('/api/ia/treino', isAuthenticated, aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const { objetivo, nivel, diasPorSemana, historico } = req.body;
      
      if (!objetivo || !nivel || !diasPorSemana) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const aiWorkout = await generateWorkout({
        objetivo,
        nivel,
        diasPorSemana: parseInt(diasPorSemana),
        historico
      });

      // Convert AI response to workout format and save
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      const workout = await storage.createWorkout({
        userId,
        name: aiWorkout.nome,
        type: aiWorkout.tipo,
        level: aiWorkout.nivel,
        exercises: aiWorkout.exercicios
      });

      res.json({ workout, aiResponse: aiWorkout });
    } catch (error) {
      console.error("Error generating AI workout:", error);
      res.status(500).json({ message: "Failed to generate workout" });
    }
  });

  // Workout routes
  app.get('/api/workouts', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      const workouts = await storage.getWorkoutsByUser(userId);
      res.json(workouts);
    } catch (error) {
      console.error("Error fetching workouts:", error);
      res.status(500).json({ message: "Failed to fetch workouts" });
    }
  });

  app.post('/api/workouts', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      const workoutData = insertWorkoutSchema.parse({ ...req.body, userId });
      const workout = await storage.createWorkout(workoutData);
      res.json(workout);
    } catch (error) {
      console.error("Error creating workout:", error);
      res.status(400).json({ message: "Failed to create workout" });
    }
  });

  // Exercise routes
  app.get('/api/exercises', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const exercises = await storage.getExercises();
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      res.status(500).json({ message: "Failed to fetch exercises" });
    }
  });

  // Workout session routes
  app.get('/api/workout-sessions', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      const sessions = await storage.getWorkoutSessionsByUser(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching workout sessions:", error);
      res.status(500).json({ message: "Failed to fetch workout sessions" });
    }
  });

  app.post('/api/workout-sessions', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      const sessionData = insertWorkoutSessionSchema.parse({ ...req.body, userId });
      const session = await storage.createWorkoutSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error("Error creating workout session:", error);
      res.status(400).json({ message: "Failed to create workout session" });
    }
  });

  app.get('/api/workout-sessions/active', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      const activeSession = await storage.getActiveWorkoutSession(userId);
      res.json(activeSession);
    } catch (error) {
      console.error("Error fetching active session:", error);
      res.status(500).json({ message: "Failed to fetch active session" });
    }
  });

  app.patch('/api/workout-sessions/:sessionId/finish', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      const session = await storage.updateWorkoutSession(sessionId, { completed: true, endTime: new Date() });
      res.json(session);
    } catch (error) {
      console.error("Error finishing workout session:", error);
      res.status(400).json({ message: "Failed to finish workout session" });
    }
  });

  // Gym admin routes
  app.get('/api/gym/members', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const gymId = req.user?.id;
      if (!gymId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      const members = await storage.getGymMembers(gymId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching gym members:", error);
      res.status(500).json({ message: "Failed to fetch gym members" });
    }
  });

  app.get('/api/gym/birthdays', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const gymId = req.user?.id;
      if (!gymId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      const birthdayMembers = await storage.getBirthdayMembers(gymId);
      res.json(birthdayMembers);
    } catch (error) {
      console.error("Error fetching birthday members:", error);
      res.status(500).json({ message: "Failed to fetch birthday members" });
    }
  });

  // Academia module routes
  const requireAcademiaRole = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Verificar se o usuário é do tipo 'academia'
    if (user.userType !== 'academia') {
      return res.status(403).json({ message: "Acesso restrito a academias" });
    }
    
    // Para academias, o gymId é o próprio ID do usuário
    // ou se tiver gymId específico, usar esse
    const gymId = user.gymId || user.id;
    if (!gymId) {
      return res.status(400).json({ message: "Academia não identificada" });
    }
    
    // Adicionar gymId ao request para uso nas rotas
    (req as any).gymId = gymId;
    next();
  };

  // Hub da Academia - permite acesso para Academia e Admin
  const requireAcademiaHubAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Verificar se o usuário é do tipo 'academia' ou 'admin'
    if (user.userType !== 'academia' && user.userType !== 'admin') {
      return res.status(403).json({ message: "Acesso restrito a academias e administradores" });
    }
    
    // Para academias, o gymId é o próprio ID do usuário ou o gymId associado
    // Para admins, pode acessar qualquer academia (gymId será passado via query param)
    let gymId = user.gymId || user.id;
    
    // Se for admin e tiver gymId na query, usar esse
    if (user.userType === 'admin' && req.query.gymId) {
      gymId = req.query.gymId as string;
    }
    
    if (!gymId) {
      return res.status(400).json({ message: "Academia não identificada" });
    }
    
    // Adicionar gymId ao request para uso nas rotas
    (req as any).gymId = gymId;
    next();
  };

  // Admin authentication middleware
  const requireAdminAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!(req.session as any)?.adminAuthenticated) {
      return res.status(401).json({ message: "Admin authentication required" });
    }
    next();
  };

  // Admin login route
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Simple admin credentials (in production, use proper hashing)
      if (username === 'admin' && password === 'admin123') {
        (req.session as any).adminAuthenticated = true;
        res.json({ success: true, message: "Admin login successful" });
      } else {
        res.status(401).json({ message: "Invalid admin credentials" });
      }
    } catch (error) {
      console.error("Error in admin login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Admin logout route
  app.post('/api/admin/logout', (req, res) => {
    (req.session as any).adminAuthenticated = false;
    // Redirecionar para o portal principal após o logout
    res.redirect('/');
  });

  // Admin logout GET (para compatibilidade com links diretos)
  app.get('/api/admin/logout', (req, res) => {
    (req.session as any).adminAuthenticated = false;
    // Redirecionar para o portal principal após o logout
    res.redirect('/');
  });

  // Nota: A rota /api/logout é agora definida em replitAuth.ts para melhor integração

  // Admin check route
  app.get('/api/admin/check', (req, res) => {
    res.json({ authenticated: !!(req.session as any)?.adminAuthenticated });
  });

  // Preview routes (development only): allow selecting a gym to preview academy views without auth
  if (process.env.NODE_ENV !== 'production') {
    console.log('[preview] Preview routes enabled');
    app.get('/api/preview/gyms', async (_req, res) => {
      try {
        const gyms = await storage.getAllGyms();
        res.json(gyms.map(g => ({ id: g.id, name: g.name, email: g.email })));
      } catch (error) {
        console.error('Error fetching preview gyms:', error);
        res.status(500).json({ message: 'Failed to fetch gyms' });
      }
    });

    app.get('/api/preview/gym/:id/dashboard', async (req, res) => {
      try {
        const gymId = req.params.id;
        const data = await storage.getAcademiaDashboard(gymId);
        res.json(data);
      } catch (error) {
        console.error('Error fetching preview dashboard:', error);
        res.status(500).json({ message: 'Failed to fetch dashboard' });
      }
    });

    app.get('/api/preview/gym/:id/alunos', async (req, res) => {
      try {
        const gymId = req.params.id;
        // Corrigir dados faltantes de associação: incluir usuários com users.gymId
        const data = await storage.getAcademiaAlunos(gymId);
        if (Array.isArray(data) && data.length === 0) {
          const all = await storage.getAllUsers();
          const fallback = all.filter((u: any) => u.userType === 'aluno' && u.gym && u.gym.id === gymId);
          return res.json(fallback);
        }
        res.json(data);
      } catch (error) {
        console.error('Error fetching preview alunos:', error);
        res.status(500).json({ message: 'Failed to fetch alunos' });
      }
    });

    app.get('/api/preview/gym/:id/personais', async (req, res) => {
      try {
        const gymId = req.params.id;
        const data = await storage.getAcademiaPersonais(gymId);
        if (Array.isArray(data) && data.length === 0) {
          const all = await storage.getAllUsers();
          const fallback = all.filter((u: any) => u.userType === 'personal' && u.gym && u.gym.id === gymId);
          return res.json(fallback);
        }
        res.json(data);
      } catch (error) {
        console.error('Error fetching preview personais:', error);
        res.status(500).json({ message: 'Failed to fetch personais' });
      }
    });

    app.get('/api/preview/gym/:id/aniversariantes', async (req, res) => {
      try {
        const gymId = req.params.id;
        const data = await storage.getAcademiaAniversariantes(gymId);
        res.json(data);
      } catch (error) {
        console.error('Error fetching preview aniversariantes:', error);
        res.status(500).json({ message: 'Failed to fetch aniversariantes' });
      }
    });

    app.get('/api/preview/gym/:id/renovacoes', async (req, res) => {
      try {
        const gymId = req.params.id;
        const data = await storage.getAcademiaRenovacoes(gymId);
        res.json(data);
      } catch (error) {
        console.error('Error fetching preview renovacoes:', error);
        res.status(500).json({ message: 'Failed to fetch renovacoes' });
      }
    });

    // Preview: list all users (admin list) sem auth
    app.get('/api/preview/users', async (_req, res) => {
      try {
        const users = await storage.getAllUsers();
        res.json(users);
      } catch (error) {
        console.error('Error fetching preview users:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
      }
    });

    // Seed: criar planos por academia e 10 alunos com assinaturas ativas (somente dev)
    app.post('/api/preview/seed', async (_req, res) => {
      try {
        const allGyms = await storage.getAllGyms();
        if (!allGyms || allGyms.length === 0) {
          return res.status(400).json({ message: 'Nenhuma academia encontrada para seed' });
        }

        // Criar 2 planos por academia
        const { gymPlans } = await import('@shared/schema');
        const { db } = await import('./db');
        const { randomUUID } = await import('crypto');
        const now = new Date();
        const addDays = (d: number) => new Date(now.getTime() + d * 86400000);

        for (const gym of allGyms) {
          // upsert dois planos
          await db!.insert(gymPlans).values({
            id: randomUUID(), gymId: gym.id, name: 'Mensal', price: 9900, durationDays: 30, isActive: true, createdAt: new Date(),
          }).onConflictDoNothing();
          await db!.insert(gymPlans).values({
            id: randomUUID(), gymId: gym.id, name: 'Trimestral', price: 24900, durationDays: 90, isActive: true, createdAt: new Date(),
          }).onConflictDoNothing();
        }

        // Carregar planos após possíveis inserts
        const allPlans = await db!.select().from(gymPlans);

        // Criar 10 alunos distribuídos entre academias
        const { users } = await import('@shared/schema');
        const emailsBase = [
          'ana', 'bruno', 'carla', 'diego', 'edu', 'fernanda', 'guilherme', 'helena', 'igor', 'julia'
        ];
        const createdUsers: any[] = [];
        for (let i = 0; i < 10; i++) {
          const gym = allGyms[i % allGyms.length];
          const email = `${emailsBase[i]}+seed${i}@teste.com`;
          const [u] = await db!.insert(users).values({
            id: randomUUID(), email, userType: 'aluno', name: emailsBase[i], gymId: gym.id, createdAt: new Date(), updatedAt: new Date(),
          }).onConflictDoNothing().returning();
          if (u) createdUsers.push(u);
        }

        // Criar assinaturas ativas para cada aluno criado
        const { gymMemberSubscriptions } = await import('@shared/schema');
        for (const u of createdUsers) {
          const plansOfGym = allPlans.filter(p => p.gymId === u.gymId);
          const plan = plansOfGym[0];
          await db!.insert(gymMemberSubscriptions).values({
            id: randomUUID(),
            gymId: u.gymId!,
            memberId: u.id,
            planId: plan.id,
            startDate: now,
            endDate: addDays(plan.durationDays),
            status: 'active',
            createdAt: new Date(),
          }).onConflictDoNothing();
        }

        res.json({ ok: true, gyms: allGyms.length, usersCreated: createdUsers.length });
      } catch (error) {
        console.error('Seed error:', error);
        res.status(500).json({ message: 'Seed failed' });
      }
    });
  }

  // Academia dashboard
  app.get('/api/academia/dashboard', isAuthenticated, requireAcademiaRole, async (req: AuthenticatedRequest, res) => {
    try {
      const gymId = (req as any).gymId;
      const dashboard = await storage.getAcademiaDashboard(gymId);
      res.json(dashboard);
    } catch (error) {
      console.error("Error fetching academia dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Academia alunos
  app.get('/api/academia/alunos', isAuthenticated, requireAcademiaRole, async (req: AuthenticatedRequest, res) => {
    try {
      const gymId = (req as any).gymId;
      const alunos = await storage.getAcademiaAlunos(gymId);
      res.json(alunos);
    } catch (error) {
      console.error("Error fetching alunos:", error);
      res.status(500).json({ message: "Failed to fetch alunos" });
    }
  });

  app.post('/api/academia/alunos', isAuthenticated, requireAcademiaRole, async (req: AuthenticatedRequest, res) => {
    try {
      const gymId = (req as any).gymId;
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(409).json({ message: "Email já está em uso" });
      }
      
      const aluno = await storage.createAcademiaAluno({ ...req.body, gymId });
      
      // Send welcome email
      try {
        const welcomeToken = emailService.generatePasswordResetToken();
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        
        await storage.setPasswordResetToken(aluno.id, welcomeToken, expires);
        
        // Get welcome email template
        const template = await storage.getEmailTemplateByType('aluno', 'welcome');
        if (template) {
          const emailSent = await emailService.sendWelcomeEmail(
            aluno.email!,
            aluno.name!,
            'aluno',
            welcomeToken,
            template
          );
          
          if (!emailSent) {
            console.warn(`Failed to send welcome email to ${aluno.email}`);
          } else {
            console.log(`✅ Welcome email sent to new aluno: ${aluno.email}`);
          }
        } else {
          console.warn('No welcome template found for aluno');
        }
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't fail the user creation if email fails
      }
      
      res.json(aluno);
    } catch (error) {
      console.error("Error creating aluno:", error);
      res.status(500).json({ message: "Failed to create aluno" });
    }
  });

  // Academia personais
  app.get('/api/academia/personais', isAuthenticated, requireAcademiaRole, async (req: AuthenticatedRequest, res) => {
    try {
      const gymId = (req as any).gymId;
      const personais = await storage.getAcademiaPersonais(gymId);
      res.json(personais);
    } catch (error) {
      console.error("Error fetching personais:", error);
      res.status(500).json({ message: "Failed to fetch personais" });
    }
  });

  app.post('/api/academia/personais', isAuthenticated, requireAcademiaRole, async (req: AuthenticatedRequest, res) => {
    try {
      const gymId = (req as any).gymId;
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(409).json({ message: "Email já está em uso" });
      }
      
      const personal = await storage.createAcademiaPersonal({ ...req.body, gymId });
      
      // Send welcome email
      try {
        const welcomeToken = emailService.generatePasswordResetToken();
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        
        await storage.setPasswordResetToken(personal.id, welcomeToken, expires);
        
        // Get welcome email template
        const template = await storage.getEmailTemplateByType('personal', 'welcome');
        if (template) {
          const emailSent = await emailService.sendWelcomeEmail(
            personal.email!,
            personal.name!,
            'personal',
            welcomeToken,
            template
          );
          
          if (!emailSent) {
            console.warn(`Failed to send welcome email to ${personal.email}`);
          } else {
            console.log(`✅ Welcome email sent to new personal: ${personal.email}`);
          }
        } else {
          console.warn('No welcome template found for personal');
        }
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't fail the user creation if email fails
      }
      
      res.json(personal);
    } catch (error) {
      console.error("Error creating personal:", error);
      res.status(500).json({ message: "Failed to create personal" });
    }
  });

  // Academia engajamento
  app.get('/api/academia/engajamento', isAuthenticated, requireAcademiaRole, async (req: AuthenticatedRequest, res) => {
    try {
      const gymId = (req as any).gymId;
      const engajamento = await storage.getAcademiaEngajamento(gymId);
      res.json(engajamento);
    } catch (error) {
      console.error("Error fetching engajamento:", error);
      res.status(500).json({ message: "Failed to fetch engagement data" });
    }
  });

  // Academia aniversariantes
  app.get('/api/academia/aniversariantes', isAuthenticated, requireAcademiaRole, async (req: AuthenticatedRequest, res) => {
    try {
      const gymId = (req as any).gymId;
      const aniversariantes = await storage.getAcademiaAniversariantes(gymId);
      res.json(aniversariantes);
    } catch (error) {
      console.error("Error fetching aniversariantes:", error);
      res.status(500).json({ message: "Failed to fetch birthday members" });
    }
  });

  // Academia renovações
  app.get('/api/academia/renovacoes', isAuthenticated, requireAcademiaRole, async (req: AuthenticatedRequest, res) => {
    try {
      const gymId = (req as any).gymId;
      const renovacoes = await storage.getAcademiaRenovacoes(gymId);
      res.json(renovacoes);
    } catch (error) {
      console.error("Error fetching renovações:", error);
      res.status(500).json({ message: "Failed to fetch renewal data" });
    }
  });

  // ===== ROTAS TEMPORÁRIAS PARA TESTE =====
  // Rota para criar usuário admin de teste
  app.post('/api/test/create-admin', async (req, res) => {
    try {
      const { email, password, name } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ message: "Email, senha e nome são obrigatórios" });
      }

      // Verificar se já existe
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Usuário já existe" });
      }

      // Criar usuário admin
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        userType: 'admin',
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ')
      });

      res.json({ 
        success: true, 
        message: "Usuário admin criado com sucesso",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          userType: user.userType
        }
      });
    } catch (error) {
      console.error("Error creating admin user:", error);
      res.status(500).json({ message: "Erro ao criar usuário admin" });
    }
  });

  // Rota para definir senha para usuário academia existente
  app.post('/api/test/set-academia-password', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      // Buscar usuário academia
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      if (user.userType !== 'academia') {
        return res.status(400).json({ message: "Usuário não é do tipo academia" });
      }

      // Definir senha
      const hashedPassword = await bcrypt.hash(password, 12);
      await storage.setUserPassword(user.id, hashedPassword);

      res.json({ 
        success: true, 
        message: "Senha definida com sucesso para a academia",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          userType: user.userType
        }
      });
    } catch (error) {
      console.error("Error setting academia password:", error);
      res.status(500).json({ message: "Erro ao definir senha" });
    }
  });

  // ===== HUB DA ACADEMIA =====
  // Rota principal do Hub da Academia
  app.get('/api/hub-academia', isAuthenticated, requireAcademiaHubAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const gymId = (req as any).gymId;
      const user = req.user;
      
      // Buscar dados da academia
      let academia = await storage.getGym(gymId);
      
      // Se não encontrar academia e o usuário for do tipo academia, criar uma temporária
      if (!academia && user.userType === 'academia') {
        academia = {
          id: gymId,
          name: user.name || 'Minha Academia',
          email: user.email || 'contato@academia.com',
          address: null,
          phone: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      if (!academia) {
        return res.status(404).json({ message: "Academia não encontrada" });
      }

      // Buscar estatísticas gerais (versão simplificada)
      let dashboard = { totalAlunos: 0, totalPersonais: 0, alunosAtivos: 0, treinosHoje: 0 };
      let alunos = [];
      let personais = [];
      let engajamento = [];
      let aniversariantes = [];
      let renovacoes = [];

      try {
        dashboard = await storage.getAcademiaDashboard(gymId);
        alunos = await storage.getAcademiaAlunos(gymId);
        personais = await storage.getAcademiaPersonais(gymId);
        engajamento = await storage.getAcademiaEngajamento(gymId);
        aniversariantes = await storage.getAcademiaAniversariantes(gymId);
        renovacoes = await storage.getAcademiaRenovacoes(gymId);
      } catch (error) {
        console.warn('Erro ao buscar dados da academia:', error);
        // Continuar com dados vazios se houver erro
      }

      res.json({
        academia: {
          id: academia.id,
          name: academia.name,
          address: academia.address || null,
          phone: academia.phone || null,
          email: academia.email,
          isActive: academia.isActive
        },
        dashboard,
        estatisticas: {
          totalAlunos: alunos.length,
          totalPersonais: personais.length,
          engajamento: engajamento,
          aniversariantes: aniversariantes.length,
          renovacoes: renovacoes.length
        },
        user: {
          id: user.id,
          name: user.name,
          userType: user.userType
        }
      });
    } catch (error) {
      console.error("Error fetching hub data:", error);
      res.status(500).json({ message: "Failed to fetch hub data" });
    }
  });

  // Rota para listar academias disponíveis (para admins)
  app.get('/api/hub-academia/academias', isAuthenticated, requireAcademiaHubAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      
      // Se for admin, listar todas as academias
      if (user.userType === 'admin') {
        const academias = await storage.getAllGyms();
        res.json(academias);
      } else {
        // Se for academia, retornar apenas sua própria academia
        const gymId = (req as any).gymId;
        const academia = await storage.getGym(gymId);
        res.json(academia ? [academia] : []);
      }
    } catch (error) {
      console.error("Error fetching academias:", error);
      res.status(500).json({ message: "Failed to fetch academias" });
    }
  });

  // Admin routes for user management
  app.get('/api/admin/users', requireAdminAuth, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create new user (admin only)
  app.post('/api/admin/users', requireAdminAuth, async (req: any, res) => {
    try {
      // Import and validate with schema
      const { insertUserSchema } = await import("@shared/schema");
      const userData = insertUserSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(userData.email as string);
      if (existingUser) {
        return res.status(409).json({ message: "Email já está em uso" });
      }
      
      // Create user without password
      const user = await storage.createUser(userData);
      
      // Generate welcome email token
      const welcomeToken = emailService.generatePasswordResetToken();
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      await storage.setPasswordResetToken(user.id, welcomeToken, expires);
      
      // Get welcome email template
      const userType = Array.isArray(userData.userType) ? userData.userType[0] : userData.userType;
      const template = await storage.getEmailTemplateByType(userType as string, 'welcome');
      if (template) {
        const userName = `${userData.firstName} ${userData.lastName}`.trim();
        const emailSent = await emailService.sendWelcomeEmail(
          userData.email as string,
          userName,
          userType as string,
          welcomeToken,
          template
        );
        
        if (!emailSent) {
          console.warn(`Failed to send welcome email to ${userData.email}`);
        }
      } else {
        console.warn(`No welcome template found for user type: ${userData.userType}`);
      }
      
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      if ((error as Error).message?.includes('duplicate key')) {
        res.status(409).json({ message: "Email já está em uso" });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  // Get single user (admin only)
  app.get('/api/admin/users/:userId', requireAdminAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user (admin only)
  app.patch('/api/admin/users/:userId', requireAdminAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { updateUserSchema } = await import("@shared/schema");
      const userData = updateUserSchema.parse(req.body);
      
      // Validate user type if provided
      const userTypeToCheck = Array.isArray(userData.userType) ? userData.userType[0] : userData.userType;
      if (userTypeToCheck && !['aluno', 'personal', 'academia'].includes(userTypeToCheck as string)) {
        return res.status(400).json({ message: "Invalid user type" });
      }
      
      const user = await storage.updateUser(userId, userData);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      if ((error as Error).message?.includes('duplicate key')) {
        res.status(409).json({ message: "Email already exists" });
      } else {
        res.status(500).json({ message: "Failed to update user" });
      }
    }
  });

  // Delete user (admin only)
  app.delete('/api/admin/users/:userId', requireAdminAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      
      console.log('🗑️ Tentando excluir usuário:', userId);
      
      // Verificar se o usuário existe primeiro
      const user = await storage.getUser(userId);
      if (!user) {
        console.log('❌ Usuário não encontrado:', userId);
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      console.log('👤 Usuário encontrado:', user.email);
      
      // Verificar se não está tentando excluir a si mesmo (sessão de usuário logado)
      if (req.user && req.user.id === userId) {
        console.log('🚫 Tentativa de auto-exclusão bloqueada:', userId);
        return res.status(400).json({ message: "Você não pode excluir sua própria conta" });
      }
      
      // Verificar se não é o último admin (se for um admin)
      if (user.userType === 'admin') {
        const allUsers = await storage.getAllUsers();
        const adminCount = allUsers.filter(u => u.userType === 'admin').length;
        if (adminCount <= 1) {
          console.log('🚫 Tentativa de excluir último admin bloqueada:', userId);
          return res.status(400).json({ message: "Não é possível excluir o último administrador do sistema" });
        }
      }
      
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        console.log('❌ Falha ao excluir usuário:', userId);
        return res.status(500).json({ message: "Falha ao excluir usuário" });
      }
      
      console.log('✅ Usuário excluído com sucesso:', userId);
      res.status(204).send();
    } catch (error) {
      console.error("❌ Erro ao excluir usuário:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Quick update user type (admin only)
  app.patch('/api/admin/users/:userId/type', requireAdminAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { userType } = req.body;
      
      if (!['aluno', 'personal', 'academia'].includes(userType)) {
        return res.status(400).json({ message: "Invalid user type" });
      }
      
      const user = await storage.updateUserType(userId, userType);
      res.json(user);
    } catch (error) {
      console.error("Error updating user type:", error);
      res.status(500).json({ message: "Failed to update user type" });
    }
  });

  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }
      
      // Update last login
      await storage.updateUser(user.id, { lastLogin: new Date() });
      
      // Set session
      (req.session as any).userId = user.id;
      (req.session as any).userEmail = user.email;
      
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          userType: user.userType 
        } 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });



  app.get('/api/auth/me', async (req, res) => {
    try {
      let userId: string | undefined;
      
      // Check for Replit Auth (OAuth) - user is in req.user with claims
      if (req.isAuthenticated && req.isAuthenticated() && req.user && (req.user as any).claims) {
        userId = (req.user as any).claims.sub;
      }
      // Check for manual auth - userId is in session
      else if ((req.session as any)?.userId) {
        userId = (req.session as any).userId as string;
      }
      
      if (!userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "Usuário não encontrado" });
      }
      
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          userType: user.userType,
          gymId: user.gymId // Incluir gymId para multi-tenant
        } 
      });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // Password setup/reset routes
  app.post('/api/auth/definir-senha', passwordResetLimiter, async (req, res) => {
    try {
      const { token, password, confirmPassword } = passwordResetSchema.parse(req.body);
      
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }
      
      // Check if token is still valid
      if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        return res.status(400).json({ message: "Token expirado" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 12);
      await storage.setUserPassword(user.id, hashedPassword);
      await storage.clearPasswordResetToken(user.id);
      
      res.json({ success: true, message: "Senha definida com sucesso" });
    } catch (error) {
      console.error("Password setup error:", error);
      res.status(400).json({ message: "Erro ao definir senha" });
    }
  });

  app.post('/api/auth/solicitar-reset', passwordResetLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        return res.json({ success: true, message: "Se o email existir, você receberá instruções" });
      }
      
      const resetToken = emailService.generatePasswordResetToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      await storage.setPasswordResetToken(user.id, resetToken, expires);
      
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
      await emailService.sendPasswordResetEmail(user.email!, userName, resetToken);
      
      res.json({ success: true, message: "Se o email existir, você receberá instruções" });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // Email template management routes (admin only)
  app.get('/api/admin/email-templates', requireAdminAuth, async (req: any, res) => {
    try {
      const templates = await storage.getEmailTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  app.post('/api/admin/email-templates', requireAdminAuth, async (req: any, res) => {
    try {
      const templateData = insertEmailTemplateSchema.parse(req.body);
      
      // Validate user type
      if (!['aluno', 'personal', 'academia'].includes(templateData.userType)) {
        return res.status(400).json({ message: "Invalid user type" });
      }
      
      const template = await storage.createEmailTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating email template:", error);
      res.status(400).json({ message: "Failed to create email template" });
    }
  });

  app.patch('/api/admin/email-templates/:templateId', requireAdminAuth, async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const templateData = req.body;
      
      // Validate user type if provided
      if (templateData.userType && !['aluno', 'personal', 'academia'].includes(templateData.userType)) {
        return res.status(400).json({ message: "Invalid user type" });
      }
      
      const template = await storage.updateEmailTemplate(templateId, templateData);
      
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error updating email template:", error);
      res.status(500).json({ message: "Failed to update email template" });
    }
  });

  app.delete('/api/admin/email-templates/:templateId', requireAdminAuth, async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const success = await storage.deleteEmailTemplate(templateId);
      
      if (!success) {
        return res.status(404).json({ message: "Email template not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting email template:", error);
      res.status(500).json({ message: "Failed to delete email template" });
    }
  });

  // Test email sending (admin only)
  app.post('/api/admin/test-email', requireAdminAuth, async (req: any, res) => {
    try {
      const { email, userType, templateType } = req.body;
      
      if (!email || !userType || !templateType) {
        return res.status(400).json({ message: "Missing required fields: email, userType, templateType" });
      }
      
      const template = await storage.getEmailTemplateByType(userType, templateType);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      if (templateType === 'welcome') {
        const emailSent = await emailService.sendTestEmail(
          email,
          userType,
          templateType,
          template
        );
        
        if (emailSent) {
          res.json({ 
            success: true, 
            message: "Email de teste enviado com sucesso!",
            details: {
              to: email,
              userType: userType,
              templateType: templateType,
              subject: template.subject
            }
          });
        } else {
          res.status(500).json({ 
            success: false, 
            message: "Falha ao enviar email de teste" 
          });
        }
      } else {
        res.status(400).json({ message: "Template type not supported for testing" });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ message: "Failed to send test email" });
    }
  });

  // Seed default email templates
  app.post('/api/admin/seed-templates', requireAdminAuth, async (req: any, res) => {
    try {
      const defaultTemplates = [
        {
          userType: 'aluno',
          templateType: 'welcome',
          subject: 'Bem-vindo ao GymSync! 🏋️‍♀️',
          content: `
            <h2>Bem-vindo ao GymSync, {{nome}}!</h2>
            <p>Estamos muito felizes em tê-lo conosco!</p>
            <p>Como aluno, você terá acesso a:</p>
            <ul>
              <li>📊 Acompanhamento de treinos personalizados</li>
              <li>🤖 Geração de treinos com IA</li>
              <li>📈 Relatórios de progresso</li>
              <li>💪 Histórico completo de exercícios</li>
            </ul>
            <p>Para começar, defina sua senha clicando no botão abaixo:</p>
            <p><a href="{{link_senha}}" class="button">Definir Minha Senha</a></p>
            <p>Seu email de acesso é: <strong>{{email}}</strong></p>
            <p>Vamos alcançar seus objetivos juntos!</p>
          `,
          isActive: true
        },
        {
          userType: 'personal',
          templateType: 'welcome',
          subject: 'Bem-vindo ao GymSync - Personal Trainer! 💪',
          content: `
            <h2>Bem-vindo ao GymSync, {{nome}}!</h2>
            <p>É um prazer ter você em nossa plataforma como Personal Trainer!</p>
            <p>Como personal, você poderá:</p>
            <ul>
              <li>👥 Gerenciar seus clientes</li>
              <li>🏋️ Criar treinos personalizados</li>
              <li>📊 Acompanhar o progresso dos alunos</li>
              <li>🤖 Usar IA para otimizar treinos</li>
              <li>📈 Gerar relatórios detalhados</li>
            </ul>
            <p>Para começar, defina sua senha clicando no botão abaixo:</p>
            <p><a href="{{link_senha}}" class="button">Definir Minha Senha</a></p>
            <p>Seu email de acesso é: <strong>{{email}}</strong></p>
            <p>Vamos transformar vidas juntos!</p>
          `,
          isActive: true
        },
        {
          userType: 'academia',
          templateType: 'welcome',
          subject: 'Bem-vindo ao GymSync - Academia! 🏢',
          content: `
            <h2>Bem-vindo ao GymSync, {{nome}}!</h2>
            <p>Sua academia agora faz parte da revolução fitness digital!</p>
            <p>Como administrador, você terá acesso a:</p>
            <ul>
              <li>🏢 Painel completo de gestão da academia</li>
              <li>👥 Gerenciamento de alunos e personal trainers</li>
              <li>📊 Relatórios de engajamento e performance</li>
              <li>🎂 Acompanhamento de aniversariantes</li>
              <li>📧 Sistema de comunicação integrado</li>
              <li>🔧 Ferramentas administrativas avançadas</li>
            </ul>
            <p>Para começar, defina sua senha clicando no botão abaixo:</p>
            <p><a href="{{link_senha}}" class="button">Definir Minha Senha</a></p>
            <p>Seu email de acesso é: <strong>{{email}}</strong></p>
            <p>Pronto para revolucionar sua academia?</p>
          `,
          isActive: true
        }
      ];

      const createdTemplates = [];
      for (const templateData of defaultTemplates) {
        // Check if template already exists
        const existing = await storage.getEmailTemplateByType(templateData.userType, templateData.templateType);
        if (!existing) {
          const template = await storage.createEmailTemplate(templateData);
          createdTemplates.push(template);
        }
      }

      res.json({ 
        success: true, 
        message: `${createdTemplates.length} templates criados`,
        templates: createdTemplates
      });
    } catch (error) {
      console.error("Error seeding email templates:", error);
      res.status(500).json({ message: "Failed to seed email templates" });
    }
  });

  // Gym/Academia management routes (admin only)
  app.get("/api/admin/gyms", requireAdminAuth, async (req, res) => {
    try {
      const gyms = await storage.getAllGyms();
      res.json(gyms);
    } catch (error) {
      console.error("Error fetching gyms:", error);
      res.status(500).json({ message: "Failed to fetch gyms" });
    }
  });

  app.get("/api/admin/gyms/:id", requireAdminAuth, async (req, res) => {
    try {
      const gym = await storage.getGym(req.params.id);
      if (!gym) {
        return res.status(404).json({ message: "Academia não encontrada" });
      }
      res.json(gym);
    } catch (error) {
      console.error("Error fetching gym:", error);
      res.status(500).json({ message: "Failed to fetch gym" });
    }
  });

  app.post("/api/admin/gyms", requireAdminAuth, async (req, res) => {
    try {
      const { insertGymSchema } = await import("@shared/schema");
      const validatedData = insertGymSchema.parse(req.body);
      
      const gym = await storage.createGym(validatedData);
      
      // Send welcome email to the gym admin if email is provided
      if (validatedData.email) {
        try {
          // Find the admin user that was created
          const adminUser = await storage.getUserByEmail(validatedData.email);
          if (adminUser) {
            const welcomeToken = emailService.generatePasswordResetToken();
            const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            
            await storage.setPasswordResetToken(adminUser.id, welcomeToken, expires);
            
            // Get welcome email template
            const template = await storage.getEmailTemplateByType('academia', 'welcome');
            if (template) {
              const emailSent = await emailService.sendWelcomeEmail(
                adminUser.email!,
                adminUser.name || validatedData.name,
                'academia',
                welcomeToken,
                template
              );
              
              if (!emailSent) {
                console.warn(`Failed to send welcome email to ${adminUser.email}`);
              } else {
                console.log(`✅ Welcome email sent to new academia admin: ${adminUser.email}`);
              }
            } else {
              console.warn('No welcome template found for academia');
            }
          }
        } catch (emailError) {
          console.error('Error sending welcome email to gym admin:', emailError);
          // Don't fail the gym creation if email fails
        }
      }
      
      res.status(201).json(gym);
    } catch (error) {
      console.error("Error creating gym:", error);
      
      // Handle validation errors
      if (error instanceof Error && error.name === "ZodError") {
        const zodError = error as any;
        const firstError = zodError.errors?.[0];
        if (firstError?.message?.includes("CNPJ inválido")) {
          return res.status(400).json({ 
            message: firstError.message,
            type: "invalid_cnpj"
          });
        }
        return res.status(400).json({ 
          message: "Dados inválidos. Verifique os campos e tente novamente.",
          details: firstError?.message || error.message
        });
      }
      
      if (error instanceof Error && error.message.includes("validation")) {
        return res.status(400).json({ message: "Dados inválidos", details: error.message });
      }
      
      // Handle duplicate constraints
      if (error && typeof error === 'object' && 'code' in error) {
        const dbError = error as any;
        if (dbError.code === '23505') {
          if (dbError.constraint_name === 'gyms_email_unique') {
            return res.status(409).json({ 
              message: "Este email já está sendo usado por outra academia. Por favor, use um email diferente.",
              type: "duplicate_email"
            });
          }
          if (dbError.constraint_name === 'gyms_cnpj_unique') {
            return res.status(409).json({ 
              message: "Este CNPJ já está cadastrado em outra academia. Por favor, verifique o número do CNPJ.",
              type: "duplicate_cnpj"
            });
          }
          // Handle other unique constraints
          return res.status(409).json({ 
            message: "Já existe uma academia com essas informações. Verifique os dados e tente novamente.",
            type: "duplicate_data"
          });
        }
      }
      
      res.status(500).json({ message: "Erro interno do servidor. Tente novamente." });
    }
  });

  app.put("/api/admin/gyms/:id", requireAdminAuth, async (req, res) => {
    try {
      const { updateGymSchema } = await import("@shared/schema");
      const validatedData = updateGymSchema.parse(req.body);
      
      const gym = await storage.updateGym(req.params.id, validatedData);
      if (!gym) {
        return res.status(404).json({ message: "Academia não encontrada" });
      }
      res.json(gym);
    } catch (error) {
      console.error("Error updating gym:", error);
      
      // Handle validation errors
      if (error instanceof Error && error.name === "ZodError") {
        const zodError = error as any;
        const firstError = zodError.errors?.[0];
        if (firstError?.message?.includes("CNPJ inválido")) {
          return res.status(400).json({ 
            message: firstError.message,
            type: "invalid_cnpj"
          });
        }
        return res.status(400).json({ 
          message: "Dados inválidos. Verifique os campos e tente novamente.",
          details: firstError?.message || error.message
        });
      }
      
      if (error instanceof Error && error.message.includes("validation")) {
        return res.status(400).json({ message: "Dados inválidos", details: error.message });
      }
      
      // Handle duplicate constraints
      if (error && typeof error === 'object' && 'code' in error) {
        const dbError = error as any;
        if (dbError.code === '23505') {
          if (dbError.constraint_name === 'gyms_email_unique') {
            return res.status(409).json({ 
              message: "Este email já está sendo usado por outra academia. Por favor, use um email diferente.",
              type: "duplicate_email"
            });
          }
          if (dbError.constraint_name === 'gyms_cnpj_unique') {
            return res.status(409).json({ 
              message: "Este CNPJ já está cadastrado em outra academia. Por favor, verifique o número do CNPJ.",
              type: "duplicate_cnpj"
            });
          }
          // Handle other unique constraints
          return res.status(409).json({ 
            message: "Já existe uma academia com essas informações. Verifique os dados e tente novamente.",
            type: "duplicate_data"
          });
        }
      }
      
      res.status(500).json({ message: "Erro interno do servidor. Tente novamente." });
    }
  });

  app.delete("/api/admin/gyms/:id", requireAdminAuth, async (req, res) => {
    try {
      const success = await storage.deleteGym(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Academia não encontrada" });
      }
      res.json({ message: "Academia excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting gym:", error);
      res.status(500).json({ message: "Failed to delete gym" });
    }
  });

  // Public route to check invite code
  app.get("/api/gyms/invite/:code", async (req, res) => {
    try {
      const gym = await storage.getGymByInviteCode(req.params.code);
      if (!gym) {
        return res.status(404).json({ message: "Código de convite inválido" });
      }
      res.json({ 
        gymName: gym.name,
        gymId: gym.id,
        isValid: true 
      });
    } catch (error) {
      console.error("Error checking invite code:", error);
      res.status(500).json({ message: "Failed to check invite code" });
    }
  });



  // Rota de login simples (fallback quando Replit Auth está desabilitado)
  app.get("/api/login", (req, res) => {
    res.redirect("/login");
  });

  // Rota temporária para associar usuário à academia
  app.post('/api/test/associate-user-gym', async (req, res) => {
    try {
      const { userId, gymId } = req.body;
      
      if (!userId || !gymId) {
        return res.status(400).json({ message: "userId e gymId são obrigatórios" });
      }

      // Atualizar usuário com gymId
      const updatedUser = await storage.updateUser(userId, { gymId });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      res.json({ 
        success: true, 
        message: "Usuário associado à academia com sucesso",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          userType: updatedUser.userType,
          gymId: updatedUser.gymId
        }
      });
    } catch (error) {
      console.error("Error associating user to gym:", error);
      res.status(500).json({ message: "Erro ao associar usuário à academia" });
    }
  });

  // Rota temporária para criar academia no banco
  app.post('/api/test/create-gym', async (req, res) => {
    try {
      const gymData = {
        name: "Fitness Plus Academia",
        email: "contato@fitnessplus.com",
        phone: "(11) 99999-9999",
        address: "Rua das Flores, 123",
        city: "São Paulo",
        state: "SP",
        zipCode: "01234-567",
        cnpj: "12.345.678/0001-90",
        isActive: true,
        maxMembers: 1000
      };

      // Criar academia no banco
      const newGym = await storage.createGym(gymData);
      
      if (!newGym) {
        return res.status(500).json({ message: "Erro ao criar academia" });
      }

      res.json({ 
        success: true, 
        message: "Academia criada com sucesso",
        gym: {
          id: newGym.id,
          name: newGym.name,
          email: newGym.email,
          phone: newGym.phone,
          address: newGym.address,
          city: newGym.city,
          state: newGym.state,
          zipCode: newGym.zipCode,
          cnpj: newGym.cnpj,
          isActive: newGym.isActive
        }
      });
    } catch (error) {
      console.error("Error creating gym:", error);
      res.status(500).json({ message: "Erro ao criar academia", error: error.message });
    }
  });

  // Rota temporária para corrigir alunos existentes
  app.post('/api/test/fix-students', async (req, res) => {
    try {
      const { gymId } = req.body;
      
      if (!gymId) {
        return res.status(400).json({ message: "gymId é obrigatório" });
      }

      // IDs dos alunos criados anteriormente
      const studentIds = [
        "12a2fb33-cb0e-4544-8f65-8c953b19c637", // ana.silva@fitnessplus.com
        "24ea2aca-d19e-48ce-9616-cd421d495744", // carlos.santos@fitnessplus.com
        "19262acf-3a93-4069-b9ea-8564efc8b1d6", // maria.oliveira@fitnessplus.com
        "626f41df-1544-4873-9ce8-39b9d3b36d68", // joao.ferreira@fitnessplus.com
        "fe3bddd1-29e5-4804-b6db-7991e7a67e03", // lucia.costa@fitnessplus.com
        "8d384e56-adc5-4b86-a46c-bd2436d72db3", // pedro.almeida@fitnessplus.com
        "c67c5b9e-0fe0-4e34-991b-96c92a9fe265", // fernanda.rodrigues@fitnessplus.com
        "80d862f8-98bf-4439-a4aa-572215b2aed7"  // rafael.mendes@fitnessplus.com
      ];

      const updatedStudents = [];
      const errors = [];

      // Atualizar cada aluno
      for (const studentId of studentIds) {
        try {
          const updateData = {
            gymId: gymId,
            isActive: true
          };

          const updatedStudent = await storage.updateUser(studentId, updateData);
          if (updatedStudent) {
            updatedStudents.push({
              id: updatedStudent.id,
              email: updatedStudent.email,
              name: `${updatedStudent.firstName || ''} ${updatedStudent.lastName || ''}`.trim(),
              userType: updatedStudent.userType,
              gymId: updatedStudent.gymId
            });
          }
        } catch (error) {
          console.error(`Erro ao atualizar aluno ${studentId}:`, error);
          errors.push({
            id: studentId,
            error: error.message
          });
        }
      }

      res.json({ 
        success: true, 
        message: `${updatedStudents.length} alunos atualizados com sucesso`,
        students: updatedStudents,
        errors: errors,
        totalUpdated: updatedStudents.length,
        totalErrors: errors.length
      });
    } catch (error) {
      console.error("Error fixing students:", error);
      res.status(500).json({ message: "Erro ao corrigir alunos", error: error.message });
    }
  });

  // Rota temporária para configurar usuários academia para todas as academias
  app.post('/api/test/setup-all-academias', async (req, res) => {
    try {
      const academias = [
        { 
          id: "81a690aa-1f9b-438c-8536-9267893922ff", 
          name: "Fitness Plus Academia", 
          email: "contato@fitnessplus.com",
          password: "123456"
        },
        { 
          id: "b6bbeace-cf85-437a-8aba-07abcd330f7a", 
          name: "Gym Power", 
          email: "admin@gympower.com.br",
          password: "123456"
        },
        { 
          id: "628215ab-a045-4c6b-b892-e7f5b06dec2b", 
          name: "FitWell", 
          email: "renansap@hotmail.com",
          password: "123456"
        },
        { 
          id: "21bffe3b-667b-4e84-ada3-0926ade0bf03", 
          name: "Sesi Novo Hamburgo", 
          email: "renansap@gmail.com",
          password: "123456"
        }
      ];
      
      const resultados = [];
      
      for (const academia of academias) {
        try {
          console.log(`🔧 Configurando academia: ${academia.name}`);
          
          // Verificar se já existe usuário academia
          let user = await storage.getUserByEmail(academia.email);
          
          if (!user) {
            // Criar usuário academia
            const userData = {
              id: randomUUID(),
              name: academia.name,
              email: academia.email,
              userType: 'academia',
              gymId: academia.id,
              isActive: true,
              emailVerified: true
            };
            
            user = await storage.createUser(userData);
            console.log(`✅ Usuário academia criado: ${academia.name}`);
          } else {
            // Atualizar usuário existente
            const updateData = {
              userType: 'academia',
              gymId: academia.id,
              isActive: true
            };
            
            user = await storage.updateUser(user.id, updateData);
            console.log(`✅ Usuário academia atualizado: ${academia.name}`);
          }
          
          // Definir senha
          const hashedPassword = await bcrypt.hash(academia.password, 12);
          await storage.updateUser(user.id, { password: hashedPassword });
          
          resultados.push({
            id: academia.id,
            name: academia.name,
            email: academia.email,
            userId: user.id,
            status: 'success',
            message: 'Academia configurada com sucesso'
          });
          
        } catch (error) {
          console.error(`❌ Erro na academia ${academia.name}:`, error.message);
          resultados.push({
            id: academia.id,
            name: academia.name,
            email: academia.email,
            status: 'error',
            message: error.message
          });
        }
      }
      
      res.json({
        totalAcademias: academias.length,
        academias: resultados
      });
    } catch (error) {
      console.error("Error setting up academias:", error);
      res.status(500).json({ message: "Failed to setup academias", error: error.message });
    }
  });

  // Rota temporária para testar todas as academias
  app.get('/api/test/debug-all-academias', async (req, res) => {
    try {
      const academias = [
        { id: "81a690aa-1f9b-438c-8536-9267893922ff", name: "Fitness Plus Academia" },
        { id: "b6bbeace-cf85-437a-8aba-07abcd330f7a", name: "Gym Power" },
        { id: "628215ab-a045-4c6b-b892-e7f5b06dec2b", name: "FitWell" },
        { id: "21bffe3b-667b-4e84-ada3-0926ade0bf03", name: "Sesi Novo Hamburgo" }
      ];
      
      const resultados = [];
      
      for (const academia of academias) {
        try {
          console.log(`🔍 Testando academia: ${academia.name} (${academia.id})`);
          
          const members = await storage.getGymMembers(academia.id);
          const alunos = members.filter(m => m.userType === 'aluno');
          const personais = members.filter(m => m.userType === 'personal');
          
          resultados.push({
            id: academia.id,
            name: academia.name,
            totalMembers: members.length,
            totalAlunos: alunos.length,
            totalPersonais: personais.length,
            alunos: alunos.map(a => ({ id: a.id, email: a.email, name: a.name }))
          });
          
          console.log(`📊 ${academia.name}: ${alunos.length} alunos, ${personais.length} personais`);
        } catch (error) {
          console.error(`❌ Erro na academia ${academia.name}:`, error.message);
          resultados.push({
            id: academia.id,
            name: academia.name,
            error: error.message,
            totalMembers: 0,
            totalAlunos: 0,
            totalPersonais: 0
          });
        }
      }
      
      res.json({
        totalAcademias: academias.length,
        academias: resultados
      });
    } catch (error) {
      console.error("Error testing all academias:", error);
      res.status(500).json({ message: "Failed to test academias", error: error.message });
    }
  });

  // Rota temporária para testar getGymMembers de uma academia específica
  app.get('/api/test/debug-gym-members/:gymId', async (req, res) => {
    try {
      const gymId = req.params.gymId;
      
      console.log('🔍 Testando getGymMembers para gymId:', gymId);
      
      const members = await storage.getGymMembers(gymId);
      console.log('📊 Membros encontrados:', members.length);
      console.log('👥 Membros:', members.map(m => ({ id: m.id, email: m.email, userType: m.userType })));
      
      const alunos = members.filter(m => m.userType === 'aluno');
      console.log('🎓 Alunos encontrados:', alunos.length);
      
      res.json({
        gymId,
        totalMembers: members.length,
        totalAlunos: alunos.length,
        members: members.map(m => ({ id: m.id, email: m.email, userType: m.userType })),
        alunos: alunos.map(a => ({ id: a.id, email: a.email, name: a.name }))
      });
    } catch (error) {
      console.error("Error testing getGymMembers:", error);
      res.status(500).json({ message: "Failed to test getGymMembers", error: error.message });
    }
  });

  // Rota temporária para testar getGymMembers
  app.get('/api/test/debug-gym-members', async (req, res) => {
    try {
      const gymId = "81a690aa-1f9b-438c-8536-9267893922ff"; // Fitness Plus Academia
      
      console.log('🔍 Testando getGymMembers para gymId:', gymId);
      
      const members = await storage.getGymMembers(gymId);
      console.log('📊 Membros encontrados:', members.length);
      console.log('👥 Membros:', members.map(m => ({ id: m.id, email: m.email, userType: m.userType })));
      
      const alunos = members.filter(m => m.userType === 'aluno');
      console.log('🎓 Alunos encontrados:', alunos.length);
      
      res.json({
        gymId,
        totalMembers: members.length,
        totalAlunos: alunos.length,
        members: members.map(m => ({ id: m.id, email: m.email, userType: m.userType })),
        alunos: alunos.map(a => ({ id: a.id, email: a.email, name: a.name }))
      });
    } catch (error) {
      console.error("Error testing getGymMembers:", error);
      res.status(500).json({ message: "Failed to test getGymMembers", error: error.message });
    }
  });

  // Rota temporária para testar hub de todas as academias
  app.get('/api/test/hub-all-academias', async (req, res) => {
    try {
      const academias = [
        { id: "81a690aa-1f9b-438c-8536-9267893922ff", name: "Fitness Plus Academia", email: "contato@fitnessplus.com" },
        { id: "b6bbeace-cf85-437a-8aba-07abcd330f7a", name: "Gym Power", email: "admin@gympower.com.br" },
        { id: "628215ab-a045-4c6b-b892-e7f5b06dec2b", name: "FitWell", email: "renansap@hotmail.com" },
        { id: "21bffe3b-667b-4e84-ada3-0926ade0bf03", name: "Sesi Novo Hamburgo", email: "renansap@gmail.com" }
      ];
      
      const resultados = [];
      
      for (const academia of academias) {
        try {
          console.log(`🔍 Testando hub da academia: ${academia.name}`);
          
          // Buscar dados da academia
          let academiaData = await storage.getGym(academia.id);
          
          if (!academiaData) {
            resultados.push({
              id: academia.id,
              name: academia.name,
              email: academia.email,
              error: "Academia não encontrada",
              dashboard: { totalAlunos: 0, totalPersonais: 0, alunosAtivos: 0, treinosHoje: 0 },
              estatisticas: { totalAlunos: 0, totalPersonais: 0, engajamento: [], aniversariantes: 0, renovacoes: 0 }
            });
            continue;
          }

          // Buscar estatísticas gerais
          let dashboard = { totalAlunos: 0, totalPersonais: 0, alunosAtivos: 0, treinosHoje: 0 };
          let alunos = [];
          let personais = [];
          let engajamento = [];
          let aniversariantes = [];
          let renovacoes = [];

          try {
            dashboard = await storage.getAcademiaDashboard(academia.id);
            alunos = await storage.getAcademiaAlunos(academia.id);
            personais = await storage.getAcademiaPersonais(academia.id);
            engajamento = await storage.getAcademiaEngajamento(academia.id);
            aniversariantes = await storage.getAcademiaAniversariantes(academia.id);
            renovacoes = await storage.getAcademiaRenovacoes(academia.id);
          } catch (error) {
            console.warn(`Erro ao buscar dados da academia ${academia.name}:`, error);
          }

          resultados.push({
            id: academia.id,
            name: academia.name,
            email: academia.email,
            academia: {
              id: academiaData.id,
              name: academiaData.name,
              address: academiaData.address || null,
              phone: academiaData.phone || null,
              email: academiaData.email,
              isActive: academiaData.isActive
            },
            dashboard,
            estatisticas: {
              totalAlunos: alunos.length,
              totalPersonais: personais.length,
              engajamento: engajamento,
              aniversariantes: aniversariantes.length,
              renovacoes: renovacoes.length
            },
            alunos: alunos.map(a => ({ id: a.id, email: a.email, name: a.name })),
            personais: personais.map(p => ({ id: p.id, email: p.email, name: p.name }))
          });
          
          console.log(`✅ ${academia.name}: ${alunos.length} alunos, ${personais.length} personais`);
        } catch (error) {
          console.error(`❌ Erro na academia ${academia.name}:`, error.message);
          resultados.push({
            id: academia.id,
            name: academia.name,
            email: academia.email,
            error: error.message,
            dashboard: { totalAlunos: 0, totalPersonais: 0, alunosAtivos: 0, treinosHoje: 0 },
            estatisticas: { totalAlunos: 0, totalPersonais: 0, engajamento: [], aniversariantes: 0, renovacoes: 0 }
          });
        }
      }
      
      res.json({
        totalAcademias: academias.length,
        academias: resultados
      });
    } catch (error) {
      console.error("Error testing all hubs:", error);
      res.status(500).json({ message: "Failed to test hubs", error: error.message });
    }
  });

  // Rota temporária para testar hub da Gym Power especificamente
  app.get('/api/test/hub-gym-power-debug', async (req, res) => {
    try {
      const gymId = "b6bbeace-cf85-437a-8aba-07abcd330f7a"; // Gym Power
      
      console.log('🔍 Testando hub da Gym Power...');
      
      let academia = await storage.getGym(gymId);
      if (!academia) {
        return res.status(404).json({ message: "Academia não encontrada" });
      }
      
      console.log('📊 Academia encontrada:', academia.name);
      
      let dashboard = { totalAlunos: 0, totalPersonais: 0, alunosAtivos: 0, sessoesSemana: 0 };
      let alunos = [];
      let personais = [];
      let engajamento = [];
      let aniversariantes = [];
      let renovacoes = [];
      
      try {
        console.log('🔍 Buscando dados da academia...');
        dashboard = await storage.getAcademiaDashboard(gymId);
        console.log('📊 Dashboard:', dashboard);
        
        alunos = await storage.getAcademiaAlunos(gymId);
        console.log('👥 Alunos encontrados:', alunos.length);
        
        personais = await storage.getAcademiaPersonais(gymId);
        console.log('🏋️ Personais encontrados:', personais.length);
        
        engajamento = await storage.getAcademiaEngajamento(gymId);
        aniversariantes = await storage.getAcademiaAniversariantes(gymId);
        renovacoes = await storage.getAcademiaRenovacoes(gymId);
      } catch (error) {
        console.warn('Erro ao buscar dados da academia:', error);
      }
      
      res.json({
        academia: {
          id: academia.id,
          name: academia.name,
          address: academia.address,
          phone: academia.phone,
          email: academia.email,
          isActive: academia.isActive
        },
        dashboard,
        estatisticas: {
          totalAlunos: dashboard.totalAlunos,
          totalPersonais: dashboard.totalPersonais,
          engajamento: engajamento,
          aniversariantes: aniversariantes.length,
          renovacoes: renovacoes.length
        },
        alunos: alunos,
        personais: personais
      });
    } catch (error) {
      console.error("Error fetching Gym Power hub data:", error);
      res.status(500).json({ message: "Failed to fetch Gym Power hub data", error: error.message });
    }
  });

  // Rota temporária para testar hub da academia sem autenticação
  app.get('/api/test/hub-academia-debug', async (req, res) => {
    try {
      const gymId = "81a690aa-1f9b-438c-8536-9267893922ff"; // Fitness Plus Academia
      
      // Buscar dados da academia
      let academia = await storage.getGym(gymId);
      
      if (!academia) {
        return res.status(404).json({ message: "Academia não encontrada" });
      }

      // Buscar estatísticas gerais
      let dashboard = { totalAlunos: 0, totalPersonais: 0, alunosAtivos: 0, treinosHoje: 0 };
      let alunos = [];
      let personais = [];
      let engajamento = [];
      let aniversariantes = [];
      let renovacoes = [];

      try {
        dashboard = await storage.getAcademiaDashboard(gymId);
        alunos = await storage.getAcademiaAlunos(gymId);
        personais = await storage.getAcademiaPersonais(gymId);
        engajamento = await storage.getAcademiaEngajamento(gymId);
        aniversariantes = await storage.getAcademiaAniversariantes(gymId);
        renovacoes = await storage.getAcademiaRenovacoes(gymId);
      } catch (error) {
        console.warn('Erro ao buscar dados da academia:', error);
      }

      res.json({
        academia: {
          id: academia.id,
          name: academia.name,
          address: academia.address || null,
          phone: academia.phone || null,
          email: academia.email,
          isActive: academia.isActive
        },
        dashboard,
        estatisticas: {
          totalAlunos: alunos.length,
          totalPersonais: personais.length,
          engajamento: engajamento,
          aniversariantes: aniversariantes.length,
          renovacoes: renovacoes.length
        },
        alunos: alunos,
        personais: personais
      });
    } catch (error) {
      console.error("Error fetching hub data:", error);
      res.status(500).json({ message: "Failed to fetch hub data", error: error.message });
    }
  });

  // Rota temporária para deletar membros incorretos da Gym Power
  app.post('/api/test/delete-gym-power-incorrect-members', async (req, res) => {
    try {
      const gymId = "b6bbeace-cf85-437a-8aba-07abcd330f7a"; // Gym Power
      
      // IDs dos alunos que NÃO pertencem à Gym Power (da Fitness Plus Academia)
      const incorrectStudentIds = [
        "12a2fb33-cb0e-4544-8f65-8c953b19c637", // ana.silva@fitnessplus.com
        "24ea2aca-d19e-48ce-9616-cd421d495744", // carlos.santos@fitnessplus.com
        "19262acf-3a93-4069-b9ea-8564efc8b1d6", // maria.oliveira@fitnessplus.com
        "626f41df-1544-4873-9ce8-39b9d3b36d68", // joao.ferreira@fitnessplus.com
        "fe3bddd1-29e5-4804-b6db-7991e7a67e03", // lucia.costa@fitnessplus.com
        "8d384e56-adc5-4b86-a46c-bd2436d72db3", // pedro.almeida@fitnessplus.com
        "c67c5b9e-0fe0-4e34-991b-96c92a9fe265", // fernanda.rodrigues@fitnessplus.com
        "80d862f8-98bf-4439-a4aa-572215b2aed7"  // rafael.mendes@fitnessplus.com
      ];
      
      const deletedMembers = [];
      const errors = [];
      
      for (const studentId of incorrectStudentIds) {
        try {
          // Deletar da tabela gymMembers
          if (db) {
            await db.delete(gymMembers)
              .where(and(
                eq(gymMembers.gymId, gymId),
                eq(gymMembers.memberId, studentId)
              ));
            
            deletedMembers.push({
              id: studentId,
              gymId: gymId
            });
          }
        } catch (error) {
          console.error(`Erro ao deletar aluno ${studentId}:`, error);
          errors.push({
            id: studentId,
            error: error.message
          });
        }
      }
      
      res.json({
        success: true,
        message: `${deletedMembers.length} membros incorretos removidos da Gym Power`,
        deletedMembers: deletedMembers,
        errors: errors,
        totalDeleted: deletedMembers.length,
        totalErrors: errors.length
      });
    } catch (error) {
      console.error("Error deleting Gym Power incorrect members:", error);
      res.status(500).json({ message: "Erro ao deletar membros incorretos da Gym Power", error: error.message });
    }
  });

  // Rota temporária para limpar associações incorretas da Gym Power
  app.post('/api/test/clean-gym-power-members', async (req, res) => {
    try {
      const gymId = "b6bbeace-cf85-437a-8aba-07abcd330f7a"; // Gym Power
      
      // IDs dos alunos que NÃO pertencem à Gym Power (da Fitness Plus Academia)
      const incorrectStudentIds = [
        "12a2fb33-cb0e-4544-8f65-8c953b19c637", // ana.silva@fitnessplus.com
        "24ea2aca-d19e-48ce-9616-cd421d495744", // carlos.santos@fitnessplus.com
        "19262acf-3a93-4069-b9ea-8564efc8b1d6", // maria.oliveira@fitnessplus.com
        "626f41df-1544-4873-9ce8-39b9d3b36d68", // joao.ferreira@fitnessplus.com
        "fe3bddd1-29e5-4804-b6db-7991e7a67e03", // lucia.costa@fitnessplus.com
        "8d384e56-adc5-4b86-a46c-bd2436d72db3", // pedro.almeida@fitnessplus.com
        "c67c5b9e-0fe0-4e34-991b-96c92a9fe265", // fernanda.rodrigues@fitnessplus.com
        "80d862f8-98bf-4439-a4aa-572215b2aed7"  // rafael.mendes@fitnessplus.com
      ];
      
      const removedMembers = [];
      const errors = [];
      
      for (const studentId of incorrectStudentIds) {
        try {
          // Buscar e remover membro da tabela gymMembers
          const members = await storage.getGymMembers(gymId);
          const memberToRemove = members.find(m => m.id === studentId);
          
          if (memberToRemove) {
            // Aqui precisaríamos de uma função para remover membro, mas por enquanto vamos apenas reportar
            removedMembers.push({
              id: studentId,
              email: memberToRemove.email,
              name: memberToRemove.name
            });
          }
        } catch (error) {
          console.error(`Erro ao remover aluno ${studentId}:`, error);
          errors.push({
            id: studentId,
            error: error.message
          });
        }
      }
      
      res.json({
        success: true,
        message: `Identificados ${removedMembers.length} membros incorretos na Gym Power`,
        removedMembers: removedMembers,
        errors: errors,
        totalRemoved: removedMembers.length,
        totalErrors: errors.length
      });
    } catch (error) {
      console.error("Error cleaning Gym Power members:", error);
      res.status(500).json({ message: "Erro ao limpar membros da Gym Power", error: error.message });
    }
  });

  // Rota temporária para associar alunos específicos da Gym Power
  app.post('/api/test/associate-gym-power-students', async (req, res) => {
    try {
      const gymId = "b6bbeace-cf85-437a-8aba-07abcd330f7a"; // Gym Power
      
      // IDs dos alunos da Gym Power (baseado na consulta anterior)
      const studentIds = [
        "bf5145b5-c1fb-4302-9622-434df2fd44a0", // ana+seed0@teste.com
        "1a17e53d-6146-45af-9e3e-912b7221585a", // diego+seed3@teste.com
        "a69aa3cf-dddc-4174-a3b8-83ef42bc9537", // guilherme+seed6@teste.com
        "f7e900bd-b574-42f0-94b3-9191a8fdf5d5"  // julia+seed9@teste.com
      ];
      
      const associatedStudents = [];
      const errors = [];
      
      for (const studentId of studentIds) {
        try {
          const gymMemberData = {
            id: randomUUID(),
            gymId: gymId,
            memberId: studentId,
            membershipType: 'mensal',
            isActive: true,
            startDate: new Date(),
            joinedAt: new Date()
          };
          
          const newMember = await storage.addGymMember(gymMemberData);
          associatedStudents.push({
            id: studentId,
            gymMemberId: newMember.id,
            gymId: gymId,
            membershipType: 'mensal'
          });
        } catch (error) {
          console.error(`Erro ao associar aluno ${studentId}:`, error);
          errors.push({
            id: studentId,
            error: error.message
          });
        }
      }
      
      res.json({
        success: true,
        message: `${associatedStudents.length} alunos da Gym Power associados à tabela gymMembers com sucesso`,
        students: associatedStudents,
        errors: errors,
        totalAssociated: associatedStudents.length,
        totalErrors: errors.length
      });
    } catch (error) {
      console.error("Error associating Gym Power students:", error);
      res.status(500).json({ message: "Erro ao associar alunos da Gym Power", error: error.message });
    }
  });

  // Rota temporária para associar alunos à tabela gymMembers
  app.post('/api/test/associate-students-gym-members', async (req, res) => {
    try {
      const { gymId } = req.body;
      
      if (!gymId) {
        return res.status(400).json({ message: "gymId é obrigatório" });
      }

      // IDs dos alunos criados anteriormente
      const studentIds = [
        "12a2fb33-cb0e-4544-8f65-8c953b19c637", // ana.silva@fitnessplus.com
        "24ea2aca-d19e-48ce-9616-cd421d495744", // carlos.santos@fitnessplus.com
        "19262acf-3a93-4069-b9ea-8564efc8b1d6", // maria.oliveira@fitnessplus.com
        "626f41df-1544-4873-9ce8-39b9d3b36d68", // joao.ferreira@fitnessplus.com
        "fe3bddd1-29e5-4804-b6db-7991e7a67e03", // lucia.costa@fitnessplus.com
        "8d384e56-adc5-4b86-a46c-bd2436d72db3", // pedro.almeida@fitnessplus.com
        "c67c5b9e-0fe0-4e34-991b-96c92a9fe265", // fernanda.rodrigues@fitnessplus.com
        "80d862f8-98bf-4439-a4aa-572215b2aed7"  // rafael.mendes@fitnessplus.com
      ];

      const associatedStudents = [];
      const errors = [];

      // Associar cada aluno à tabela gymMembers
      for (const studentId of studentIds) {
        try {
          const gymMemberData = {
            gymId: gymId,
            memberId: studentId,
            membershipType: "mensal",
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
            isActive: true
          };

          const newGymMember = await storage.addGymMember(gymMemberData);
          if (newGymMember) {
            associatedStudents.push({
              id: studentId,
              gymMemberId: newGymMember.id,
              gymId: gymId,
              membershipType: "mensal"
            });
          }
        } catch (error) {
          console.error(`Erro ao associar aluno ${studentId} à gymMembers:`, error);
          errors.push({
            id: studentId,
            error: error.message
          });
        }
      }

      res.json({ 
        success: true, 
        message: `${associatedStudents.length} alunos associados à tabela gymMembers com sucesso`,
        students: associatedStudents,
        errors: errors,
        totalAssociated: associatedStudents.length,
        totalErrors: errors.length
      });
    } catch (error) {
      console.error("Error associating students to gym members:", error);
      res.status(500).json({ message: "Erro ao associar alunos à gymMembers", error: error.message });
    }
  });

  // Rota temporária para gerar alunos para a academia
  app.post('/api/test/create-students', async (req, res) => {
    try {
      const { gymId, count = 8 } = req.body;
      
      if (!gymId) {
        return res.status(400).json({ message: "gymId é obrigatório" });
      }

      // Dados dos alunos para gerar
      const studentsData = [
        {
          email: "ana.silva@fitnessplus.com",
          firstName: "Ana",
          lastName: "Silva",
          userType: "aluno",
          phone: "(11) 99999-0001",
          address: "Rua das Flores, 100",
          city: "São Paulo",
          state: "SP",
          zipCode: "01234-100",
          height: 165,
          weight: 60,
          fitnessGoal: "emagrecimento",
          fitnessLevel: "iniciante",
          membershipType: "mensal",
          membershipStart: new Date(),
          membershipEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
          gymId: gymId,
          isActive: true
        },
        {
          email: "carlos.santos@fitnessplus.com",
          firstName: "Carlos",
          lastName: "Santos",
          userType: "aluno",
          phone: "(11) 99999-0002",
          address: "Rua das Flores, 101",
          city: "São Paulo",
          state: "SP",
          zipCode: "01234-101",
          height: 180,
          weight: 85,
          fitnessGoal: "hipertrofia",
          fitnessLevel: "intermediário",
          membershipType: "mensal",
          membershipStart: new Date(),
          membershipEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          gymId: gymId,
          isActive: true
        },
        {
          email: "maria.oliveira@fitnessplus.com",
          firstName: "Maria",
          lastName: "Oliveira",
          userType: "aluno",
          phone: "(11) 99999-0003",
          address: "Rua das Flores, 102",
          city: "São Paulo",
          state: "SP",
          zipCode: "01234-102",
          height: 160,
          weight: 55,
          fitnessGoal: "resistência",
          fitnessLevel: "avançado",
          membershipType: "trimestral",
          membershipStart: new Date(),
          membershipEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 dias
          gymId: gymId,
          isActive: true
        },
        {
          email: "joao.ferreira@fitnessplus.com",
          firstName: "João",
          lastName: "Ferreira",
          userType: "aluno",
          phone: "(11) 99999-0004",
          address: "Rua das Flores, 103",
          city: "São Paulo",
          state: "SP",
          zipCode: "01234-103",
          height: 175,
          weight: 70,
          fitnessGoal: "força",
          fitnessLevel: "intermediário",
          membershipType: "mensal",
          membershipStart: new Date(),
          membershipEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          gymId: gymId,
          isActive: true
        },
        {
          email: "lucia.costa@fitnessplus.com",
          firstName: "Lúcia",
          lastName: "Costa",
          userType: "aluno",
          phone: "(11) 99999-0005",
          address: "Rua das Flores, 104",
          city: "São Paulo",
          state: "SP",
          zipCode: "01234-104",
          height: 155,
          weight: 50,
          fitnessGoal: "emagrecimento",
          fitnessLevel: "iniciante",
          membershipType: "mensal",
          membershipStart: new Date(),
          membershipEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          gymId: gymId,
          isActive: true
        },
        {
          email: "pedro.almeida@fitnessplus.com",
          firstName: "Pedro",
          lastName: "Almeida",
          userType: "aluno",
          phone: "(11) 99999-0006",
          address: "Rua das Flores, 105",
          city: "São Paulo",
          state: "SP",
          zipCode: "01234-105",
          height: 185,
          weight: 90,
          fitnessGoal: "hipertrofia",
          fitnessLevel: "avançado",
          membershipType: "semestral",
          membershipStart: new Date(),
          membershipEnd: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 dias
          gymId: gymId,
          isActive: true
        },
        {
          email: "fernanda.rodrigues@fitnessplus.com",
          firstName: "Fernanda",
          lastName: "Rodrigues",
          userType: "aluno",
          phone: "(11) 99999-0007",
          address: "Rua das Flores, 106",
          city: "São Paulo",
          state: "SP",
          zipCode: "01234-106",
          height: 170,
          weight: 65,
          fitnessGoal: "resistência",
          fitnessLevel: "intermediário",
          membershipType: "mensal",
          membershipStart: new Date(),
          membershipEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          gymId: gymId,
          isActive: true
        },
        {
          email: "rafael.mendes@fitnessplus.com",
          firstName: "Rafael",
          lastName: "Mendes",
          userType: "aluno",
          phone: "(11) 99999-0008",
          address: "Rua das Flores, 107",
          city: "São Paulo",
          state: "SP",
          zipCode: "01234-107",
          height: 178,
          weight: 75,
          fitnessGoal: "força",
          fitnessLevel: "iniciante",
          membershipType: "mensal",
          membershipStart: new Date(),
          membershipEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          gymId: gymId,
          isActive: true
        }
      ];

      const createdStudents = [];
      const errors = [];

      // Criar cada aluno no banco
      for (const studentData of studentsData.slice(0, count)) {
        try {
          const newStudent = await storage.createUser(studentData);
          if (newStudent) {
            createdStudents.push({
              id: newStudent.id,
              email: newStudent.email,
              name: `${newStudent.firstName} ${newStudent.lastName}`,
              userType: newStudent.userType,
              gymId: newStudent.gymId
            });
          }
        } catch (error) {
          console.error(`Erro ao criar aluno ${studentData.email}:`, error);
          errors.push({
            email: studentData.email,
            error: error.message
          });
        }
      }

      res.json({ 
        success: true, 
        message: `${createdStudents.length} alunos criados com sucesso`,
        students: createdStudents,
        errors: errors,
        totalCreated: createdStudents.length,
        totalErrors: errors.length
      });
    } catch (error) {
      console.error("Error creating students:", error);
      res.status(500).json({ message: "Erro ao criar alunos", error: error.message });
    }
  });

  const httpServer = createServer(app);
  
  // Ensure default email templates exist after all routes are set up
  setTimeout(async () => {
    try {
      // Wait for storage to be fully initialized
      let attempts = 0;
      while (!storage && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      if (!storage) {
        console.error('❌ Storage not available for email templates initialization');
        return;
      }
      
      await ensureDefaultEmailTemplates();
      console.log('🎯 Default email templates initialization completed');
    } catch (error) {
      console.error('❌ Failed to initialize default email templates:', error);
    }
  }, 3000); // Wait 3 seconds
  
  return httpServer;
}