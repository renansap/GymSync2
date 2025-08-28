import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateWorkout } from "./aiService";
import { emailService } from "./emailService";
import { insertWorkoutSchema, insertWorkoutSessionSchema, loginSchema, passwordResetSchema, insertEmailTemplateSchema } from "@shared/schema";
import bcrypt from 'bcrypt';

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // AI Workout Generation
  app.post('/api/ia/treino', isAuthenticated, async (req: any, res) => {
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
      const userId = req.user.claims.sub;
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
  app.get('/api/workouts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workouts = await storage.getWorkoutsByUser(userId);
      res.json(workouts);
    } catch (error) {
      console.error("Error fetching workouts:", error);
      res.status(500).json({ message: "Failed to fetch workouts" });
    }
  });

  app.post('/api/workouts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workoutData = insertWorkoutSchema.parse({ ...req.body, userId });
      const workout = await storage.createWorkout(workoutData);
      res.json(workout);
    } catch (error) {
      console.error("Error creating workout:", error);
      res.status(400).json({ message: "Failed to create workout" });
    }
  });

  // Exercise routes
  app.get('/api/exercises', isAuthenticated, async (req: any, res) => {
    try {
      const exercises = await storage.getAllExercises();
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      res.status(500).json({ message: "Failed to fetch exercises" });
    }
  });

  // Workout session routes
  app.get('/api/workout-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessions = await storage.getWorkoutSessionsByUser(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching workout sessions:", error);
      res.status(500).json({ message: "Failed to fetch workout sessions" });
    }
  });

  app.post('/api/workout-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessionData = insertWorkoutSessionSchema.parse({ ...req.body, userId });
      const session = await storage.createWorkoutSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error("Error creating workout session:", error);
      res.status(400).json({ message: "Failed to create workout session" });
    }
  });

  app.get('/api/workout-sessions/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const activeSession = await storage.getActiveWorkoutSession(userId);
      res.json(activeSession);
    } catch (error) {
      console.error("Error fetching active session:", error);
      res.status(500).json({ message: "Failed to fetch active session" });
    }
  });

  app.patch('/api/workout-sessions/:sessionId/finish', isAuthenticated, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.claims.sub;
      const session = await storage.finishWorkoutSession(sessionId, userId);
      res.json(session);
    } catch (error) {
      console.error("Error finishing workout session:", error);
      res.status(400).json({ message: "Failed to finish workout session" });
    }
  });

  // Gym admin routes
  app.get('/api/gym/members', isAuthenticated, async (req: any, res) => {
    try {
      const gymId = req.user.claims.sub;
      const members = await storage.getGymMembers(gymId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching gym members:", error);
      res.status(500).json({ message: "Failed to fetch gym members" });
    }
  });

  app.get('/api/gym/birthdays', isAuthenticated, async (req: any, res) => {
    try {
      const gymId = req.user.claims.sub;
      const birthdayMembers = await storage.getBirthdayMembers(gymId);
      res.json(birthdayMembers);
    } catch (error) {
      console.error("Error fetching birthday members:", error);
      res.status(500).json({ message: "Failed to fetch birthday members" });
    }
  });

  // Academia module routes
  const requireAcademiaRole = (req: any, res: any, next: any) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // For now, allow all authenticated users to test - in production, check user role
    next();
  };

  // Admin authentication middleware
  const requireAdminAuth = (req: any, res: any, next: any) => {
    if (!req.session?.adminAuthenticated) {
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
        req.session.adminAuthenticated = true;
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
    req.session.adminAuthenticated = false;
    res.json({ success: true, message: "Admin logout successful" });
  });

  // Admin check route
  app.get('/api/admin/check', (req, res) => {
    res.json({ authenticated: !!req.session?.adminAuthenticated });
  });

  // Academia dashboard
  app.get('/api/academia/dashboard', isAuthenticated, requireAcademiaRole, async (req: any, res) => {
    try {
      const gymId = req.user.claims.sub;
      const dashboard = await storage.getAcademiaDashboard(gymId);
      res.json(dashboard);
    } catch (error) {
      console.error("Error fetching academia dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Academia alunos
  app.get('/api/academia/alunos', isAuthenticated, requireAcademiaRole, async (req: any, res) => {
    try {
      const gymId = req.user.claims.sub;
      const alunos = await storage.getAcademiaAlunos(gymId);
      res.json(alunos);
    } catch (error) {
      console.error("Error fetching alunos:", error);
      res.status(500).json({ message: "Failed to fetch alunos" });
    }
  });

  app.post('/api/academia/alunos', isAuthenticated, requireAcademiaRole, async (req: any, res) => {
    try {
      const gymId = req.user.claims.sub;
      const aluno = await storage.createAcademiaAluno({ ...req.body, gymId });
      res.json(aluno);
    } catch (error) {
      console.error("Error creating aluno:", error);
      res.status(500).json({ message: "Failed to create aluno" });
    }
  });

  // Academia personais
  app.get('/api/academia/personais', isAuthenticated, requireAcademiaRole, async (req: any, res) => {
    try {
      const gymId = req.user.claims.sub;
      const personais = await storage.getAcademiaPersonais(gymId);
      res.json(personais);
    } catch (error) {
      console.error("Error fetching personais:", error);
      res.status(500).json({ message: "Failed to fetch personais" });
    }
  });

  app.post('/api/academia/personais', isAuthenticated, requireAcademiaRole, async (req: any, res) => {
    try {
      const gymId = req.user.claims.sub;
      const personal = await storage.createAcademiaPersonal({ ...req.body, gymId });
      res.json(personal);
    } catch (error) {
      console.error("Error creating personal:", error);
      res.status(500).json({ message: "Failed to create personal" });
    }
  });

  // Academia engajamento
  app.get('/api/academia/engajamento', isAuthenticated, requireAcademiaRole, async (req: any, res) => {
    try {
      const gymId = req.user.claims.sub;
      const engajamento = await storage.getAcademiaEngajamento(gymId);
      res.json(engajamento);
    } catch (error) {
      console.error("Error fetching engajamento:", error);
      res.status(500).json({ message: "Failed to fetch engagement data" });
    }
  });

  // Academia aniversariantes
  app.get('/api/academia/aniversariantes', isAuthenticated, requireAcademiaRole, async (req: any, res) => {
    try {
      const gymId = req.user.claims.sub;
      const aniversariantes = await storage.getAcademiaAniversariantes(gymId);
      res.json(aniversariantes);
    } catch (error) {
      console.error("Error fetching aniversariantes:", error);
      res.status(500).json({ message: "Failed to fetch birthday members" });
    }
  });

  // Academia renovações
  app.get('/api/academia/renovacoes', isAuthenticated, requireAcademiaRole, async (req: any, res) => {
    try {
      const gymId = req.user.claims.sub;
      const renovacoes = await storage.getAcademiaRenovacoes(gymId);
      res.json(renovacoes);
    } catch (error) {
      console.error("Error fetching renovações:", error);
      res.status(500).json({ message: "Failed to fetch renewal data" });
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
      const userData = req.body;
      
      // Validate required fields
      if (!userData.firstName || !userData.lastName || !userData.email || !userData.userType) {
        return res.status(400).json({ message: "Missing required fields: firstName, lastName, email, userType" });
      }
      
      if (!['aluno', 'personal', 'academia'].includes(userData.userType)) {
        return res.status(400).json({ message: "Invalid user type" });
      }
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(userData.email);
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
      const template = await storage.getEmailTemplateByType(userData.userType, 'welcome');
      if (template) {
        const userName = `${userData.firstName} ${userData.lastName}`.trim();
        const emailSent = await emailService.sendWelcomeEmail(
          userData.email,
          userName,
          userData.userType,
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
      if (error.message?.includes('duplicate key')) {
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
      const userData = req.body;
      
      // Validate user type if provided
      if (userData.userType && !['aluno', 'personal', 'academia'].includes(userData.userType)) {
        return res.status(400).json({ message: "Invalid user type" });
      }
      
      const user = await storage.updateUser(userId, userData);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      if (error.message?.includes('duplicate key')) {
        res.status(409).json({ message: "Email already exists" });
      } else {
        res.status(500).json({ message: "Failed to update user" });
      }
    }
  });

  // Delete user (admin only)
  app.delete('/api/admin/users/:userId', requireAdminAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
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
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      
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

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get('/api/auth/me', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "Usuário não encontrado" });
      }
      
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
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // Password setup/reset routes
  app.post('/api/auth/definir-senha', async (req, res) => {
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

  app.post('/api/auth/solicitar-reset', async (req, res) => {
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
        const testToken = emailService.generatePasswordResetToken();
        const emailSent = await emailService.sendWelcomeEmail(
          email,
          'Usuário Teste',
          userType,
          testToken,
          template
        );
        
        res.json({ success: emailSent, message: emailSent ? "Email de teste enviado" : "Falha ao enviar email" });
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
      res.status(201).json(gym);
    } catch (error) {
      console.error("Error creating gym:", error);
      if (error instanceof Error && error.message.includes("validation")) {
        return res.status(400).json({ message: "Dados inválidos", details: error.message });
      }
      res.status(500).json({ message: "Failed to create gym" });
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
      if (error instanceof Error && error.message.includes("validation")) {
        return res.status(400).json({ message: "Dados inválidos", details: error.message });
      }
      res.status(500).json({ message: "Failed to update gym" });
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

  const httpServer = createServer(app);
  return httpServer;
}