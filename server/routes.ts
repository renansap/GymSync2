import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateWorkout } from "./aiService";
import { insertWorkoutSchema, insertWorkoutSessionSchema } from "@shared/schema";

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
      
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error.message?.includes('duplicate key')) {
        res.status(409).json({ message: "Email already exists" });
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

  const httpServer = createServer(app);
  return httpServer;
}