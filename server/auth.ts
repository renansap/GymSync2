import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface User {
  id: string;
  email: string;
  userType: "aluno" | "personal";
  name?: string;
  password?: string;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedRequest extends express.Request {
  user?: User;
  isAuthenticated(): boolean;
  login(user: any, callback: (err: any) => void): void;
  logout(callback: (err: any) => void): void;
}

// Middleware para verificar JWT
export const authenticateJWT = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.sendStatus(403);
      }

      req.user = user as User;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Middleware para verificar se está autenticado
export const isAuthenticated = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Não autenticado" });
};

// Configurar Passport
export const setupPassport = (app: express.Application) => {
  // Serialização do usuário
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(new Error('Usuário não encontrado'), null);
      }
      done(null, user);
    } catch (error) {
      console.error('Erro ao deserializar usuário:', error);
      done(error, null);
    }
  });

  // Estratégia Google OAuth
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || "your-google-client-id",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "your-google-client-secret",
    callbackURL: "/api/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Verificar se o usuário já existe
      let user = await storage.getUserByGoogleId(profile.id);
      
      if (!user) {
        // Criar novo usuário
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("Email não encontrado no perfil Google"), null);
        }

        // Verificar se já existe usuário com este email
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          // Atualizar usuário existente com Google ID
          user = await storage.updateUserGoogleId(existingUser.id, profile.id);
        } else {
          // Criar novo usuário (padrão como aluno)
          user = await storage.createUser({
            email,
            name: profile.displayName || "Usuário Google",
            userType: "aluno",
            googleId: profile.id
          });
        }
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());
  
  console.log('✅ Passport configurado com sucesso');
};

// Rotas de autenticação
export const setupAuthRoutes = (app: express.Application) => {
  // Login tradicional
  app.post('/api/auth/login', async (req: AuthenticatedRequest, res) => {
    try {
      const { email, password, userType } = req.body;

      if (!email || !password || !userType) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios" });
      }

      // Buscar usuário
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({ message: "Usuário não encontrado" });
      }

      // Verificar tipo de usuário
      if (user.userType !== userType) {
        return res.status(401).json({ message: "Tipo de usuário incorreto" });
      }

      // Verificar senha
      if (!user.password) {
        return res.status(401).json({ message: "Este usuário não possui senha configurada" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Senha incorreta" });
      }

      // Login bem-sucedido
      req.login(user, (err) => {
        if (err) {
          console.error("Erro no login:", err);
          return res.status(500).json({ message: "Erro ao fazer login" });
        }

        // Gerar JWT
        const token = jwt.sign(
          { 
            id: user.id, 
            email: user.email, 
            userType: user.userType 
          }, 
          JWT_SECRET, 
          { expiresIn: '24h' }
        );

        res.json({
          message: "Login realizado com sucesso",
          user: {
            id: user.id,
            email: user.email,
            userType: user.userType,
            name: user.name
          },
          token
        });
      });
    } catch (error) {
      console.error("Erro no login:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Logout
  app.post('/api/auth/logout', (req: AuthenticatedRequest, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Erro no logout:", err);
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      // Redirecionar para o portal principal após o logout
      res.redirect('/');
    });
  });

  // Logout GET (para compatibilidade com links diretos)
  app.get('/api/auth/logout', (req: AuthenticatedRequest, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Erro no logout:", err);
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      // Redirecionar para o portal principal após o logout
      res.redirect('/');
    });
  });

  // Verificar usuário atual
  app.get('/api/auth/me', isAuthenticated, (req: AuthenticatedRequest, res) => {
    if (req.user) {
      res.json({
        id: req.user.id,
        email: req.user.email,
        userType: req.user.userType,
        name: req.user.name
      });
    } else {
      res.status(401).json({ message: "Não autenticado" });
    }
  });

  // Google OAuth
  app.get('/api/auth/google', passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  }));

  app.get('/api/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      // Redirecionar baseado no tipo de usuário
      const user = req.user as User;
      
      if (user.userType === 'aluno') {
        res.redirect('/aluno');
      } else if (user.userType === 'personal') {
        res.redirect('/personal');
      } else {
        res.redirect('/');
      }
    }
  );

  // Registrar novo usuário
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, userType, name } = req.body;

      if (!email || !password || !userType) {
        return res.status(400).json({ message: "Todos os campos obrigatórios devem ser preenchidos" });
      }

      // Verificar se usuário já existe
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Usuário com este email já existe" });
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // Criar usuário
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        userType,
        name: name || email.split('@')[0]
      });

      res.status(201).json({
        message: "Usuário criado com sucesso",
        user: {
          id: user.id,
          email: user.email,
          userType: user.userType,
          name: user.name
        }
      });
    } catch (error) {
      console.error("Erro no registro:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
}; 