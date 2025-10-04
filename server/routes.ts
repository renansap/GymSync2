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
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Verificar se há dados de login na sessão
      const sessionLoginData = (req.session as any)?.loginData;
      
      const user = await storage.getUser(userId);
      
      // Redirect based on user type (priorizar dados da sessão)
      let redirectUrl = '/';
      let userType = user?.userType;
      
      // Se há dados da sessão, usar o tipo selecionado pelo usuário
      if (sessionLoginData?.userType && typeof sessionLoginData.userType === 'string') {
        userType = sessionLoginData.userType;
      }
      
      if (userType === 'aluno') {
        redirectUrl = '/aluno';
      } else if (userType === 'personal') {
        redirectUrl = '/personal';
      } else if (userType === 'academia') {
        redirectUrl = '/hub-academia';
      } else if (userType === 'admin') {
        // Para super admins, verificar se precisam selecionar academia
        if (!user?.activeGymId) {
          const availableGyms = await storage.getGymsForUser(userId);
          if (availableGyms.length > 1) {
            redirectUrl = '/select-gym';
          } else if (availableGyms.length === 1) {
            // Se tiver apenas uma academia, definir como ativa automaticamente
            await storage.setActiveGym(userId, availableGyms[0].id);
            redirectUrl = '/hub-academia';
          } else {
            redirectUrl = '/hub-academia';
          }
        } else {
          redirectUrl = '/hub-academia';
        }
      } else {
        redirectUrl = '/';
      }
      
      // Limpar dados da sessão após uso
      if ((req.session as any)?.loginData) {
        delete (req.session as any).loginData;
      }
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error("Error in smart redirect:", error);
      // Fallback to home page if there's an error
      res.redirect('/');
    }
  });

  // Gym Access routes
  app.get('/api/gyms/available', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const gyms = await storage.getGymsForUser(userId);
      res.json(gyms);
    } catch (error) {
      console.error("Error fetching available gyms:", error);
      res.status(500).json({ message: "Failed to fetch available gyms" });
    }
  });

  app.post('/api/gyms/set-active', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const { gymId } = req.body;
      
      // Validar se o gymId é válido (se fornecido)
      if (gymId) {
        const availableGyms = await storage.getGymsForUser(userId);
        const hasAccess = availableGyms.some(gym => gym.id === gymId);
        
        if (!hasAccess) {
          return res.status(403).json({ message: "Você não tem acesso a esta academia" });
        }
      }

      const updatedUser = await storage.setActiveGym(userId, gymId || null);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error setting active gym:", error);
      res.status(500).json({ message: "Failed to set active gym" });
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
  const requireAcademiaRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Verificar se o usuário é do tipo 'academia' OU 'admin' OU tem acesso via gym_access
    const isAcademia = user.userType === 'academia';
    const isAdmin = user.userType === 'admin';
    
    // Se não for academia nem admin, verificar se tem acesso via activeGymId
    if (!isAcademia && !isAdmin) {
      if (!user.activeGymId) {
        return res.status(403).json({ message: "Acesso restrito a academias" });
      }
    }
    
    // Determinar gymId baseado na prioridade:
    // 1. activeGymId (academia selecionada pelo usuário)
    // 2. gymId do usuário
    // 3. id do usuário (para academias legacy)
    let gymId = user.activeGymId || user.gymId || user.id;
    
    if (!gymId) {
      return res.status(400).json({ message: "Academia não identificada" });
    }
    
    // Adicionar gymId ao request para uso nas rotas
    (req as any).gymId = gymId;
    next();
  };

  // Hub da Academia - permite acesso para Academia e Admin
  const requireAcademiaHubAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Verificar se o usuário é do tipo 'academia' ou 'admin'
    if (user.userType !== 'academia' && user.userType !== 'admin') {
      return res.status(403).json({ message: "Acesso restrito a academias e administradores" });
    }
    
    // Determinar gymId baseado na prioridade:
    // 1. activeGymId (academia selecionada pelo usuário)
    // 2. gymId da query (para compatibilidade)
    // 3. gymId do usuário (fallback legado)
    // 4. id do usuário (fallback final)
    let gymId = user.activeGymId || user.gymId || user.id;
    
    // Se tiver gymId na query, usar esse (sobrescreve activeGymId)
    if (req.query.gymId) {
      gymId = req.query.gymId as string;
    }
    
    // Para super admins sem academia ativa, verificar se têm academias disponíveis
    if (user.userType === 'admin' && !user.activeGymId && !req.query.gymId) {
      try {
        const availableGyms = await storage.getGymsForUser(user.id);
        
        // Se tiver múltiplas academias, retornar erro pedindo para selecionar
        if (availableGyms.length > 1) {
          return res.status(400).json({ 
            message: "Selecione uma academia",
            requiresGymSelection: true
          });
        }
        
        // Se tiver apenas uma academia, usar essa automaticamente
        if (availableGyms.length === 1) {
          gymId = availableGyms[0].id;
        }
      } catch (error) {
        console.error('Error checking available gyms:', error);
      }
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

  // ===== ACADEMIA PLANOS =====
  // Get all plans for a gym
  app.get('/api/academia/planos', isAuthenticated, requireAcademiaRole, async (req: AuthenticatedRequest, res) => {
    try {
      const gymId = (req as any).gymId;
      const plans = await storage.getGymPlans(gymId);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching gym plans:", error);
      res.status(500).json({ message: "Failed to fetch gym plans" });
    }
  });

  // Create a new plan for a gym
  app.post('/api/academia/planos', isAuthenticated, requireAcademiaRole, async (req: AuthenticatedRequest, res) => {
    try {
      const gymId = (req as any).gymId;
      const { insertGymPlanSchema } = await import("@shared/schema");
      
      const validatedData = insertGymPlanSchema.parse({ ...req.body, gymId });
      const plan = await storage.createGymPlan(validatedData);
      
      res.json(plan);
    } catch (error: any) {
      console.error("Error creating gym plan:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create gym plan" });
    }
  });

  // Update a plan
  app.put('/api/academia/planos/:planId', isAuthenticated, requireAcademiaRole, async (req: AuthenticatedRequest, res) => {
    try {
      const { planId } = req.params;
      const gymId = (req as any).gymId;
      
      // Verify plan belongs to this gym
      const existingPlan = await storage.getGymPlan(planId);
      if (!existingPlan) {
        return res.status(404).json({ message: "Plano não encontrado" });
      }
      if (existingPlan.gymId !== gymId) {
        return res.status(403).json({ message: "Você não tem permissão para editar este plano" });
      }

      const { updateGymPlanSchema } = await import("@shared/schema");
      const validatedData = updateGymPlanSchema.parse(req.body);
      
      const updatedPlan = await storage.updateGymPlan(planId, validatedData);
      
      if (!updatedPlan) {
        return res.status(404).json({ message: "Plano não encontrado" });
      }
      
      res.json(updatedPlan);
    } catch (error: any) {
      console.error("Error updating gym plan:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update gym plan" });
    }
  });

  // Delete a plan
  app.delete('/api/academia/planos/:planId', isAuthenticated, requireAcademiaRole, async (req: AuthenticatedRequest, res) => {
    try {
      const { planId } = req.params;
      const gymId = (req as any).gymId;
      
      // Verify plan belongs to this gym
      const existingPlan = await storage.getGymPlan(planId);
      if (!existingPlan) {
        return res.status(404).json({ message: "Plano não encontrado" });
      }
      if (existingPlan.gymId !== gymId) {
        return res.status(403).json({ message: "Você não tem permissão para excluir este plano" });
      }
      
      const success = await storage.deleteGymPlan(planId);
      
      if (!success) {
        return res.status(404).json({ message: "Plano não encontrado" });
      }
      
      res.json({ message: "Plano excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting gym plan:", error);
      res.status(500).json({ message: "Failed to delete gym plan" });
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
      
      // Verificar se o usuário existe primeiro
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Verificar se não está tentando excluir a si mesmo (sessão de usuário logado)
      if (req.user && req.user.id === userId) {
        return res.status(400).json({ message: "Você não pode excluir sua própria conta" });
      }
      
      // Verificar se não é o último admin (se for um admin)
      if (user.userType === 'admin') {
        const allUsers = await storage.getAllUsers();
        const adminCount = allUsers.filter(u => u.userType === 'admin').length;
        if (adminCount <= 1) {
          return res.status(400).json({ message: "Não é possível excluir o último administrador do sistema" });
        }
      }
      
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(500).json({ message: "Falha ao excluir usuário" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
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
    } catch (error) {
      console.error('❌ Failed to initialize default email templates:', error);
    }
  }, 3000); // Wait 3 seconds
  
  return httpServer;
}