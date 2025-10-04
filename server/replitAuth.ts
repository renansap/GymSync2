import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Import modules using ES modules syntax
import passport from "passport";
import session from "express-session";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";

import { env } from './config/env';

// Check for required environment variables but don't throw on import
const REPLIT_DOMAINS = env.REPLIT_DOMAINS;
const REPL_ID = env.REPL_ID;

const getOidcConfig = memoize(
  async () => {
    const config = await client.discovery(
      new URL(env.ISSUER_URL ?? "https://replit.com/oidc"),
      REPL_ID!
    );
    return config;
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Always use memory store for now - database configuration can be added later
  const Store = MemoryStore(session);
  const sessionStore = new Store({
    checkPeriod: 86400000, // prune expired entries every 24h
  });
  
  const sessionConfig = session({
    secret: env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true, // Set to true for Replit (HTTPS)
      sameSite: 'none', // Required for cross-origin requests
      maxAge: sessionTtl,
    },
  });
  
  return sessionConfig;
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  
  // Ensure expires_at is properly set as a number
  if (user.claims?.exp && typeof user.claims.exp === 'number') {
    user.expires_at = user.claims.exp;
  } else if (tokens.expires_in && typeof tokens.expires_in === 'number') {
    // Fallback: calculate expires_at from expires_in
    user.expires_at = Math.floor(Date.now() / 1000) + tokens.expires_in;
  } else {
    // Default: set expires_at to 1 hour from now
    user.expires_at = Math.floor(Date.now() / 1000) + 3600;
  }
  
  // Ensure expires_at is a valid number
  if (typeof user.expires_at !== 'number' || isNaN(user.expires_at)) {
    console.warn('Invalid expires_at, setting to default 1 hour');
    user.expires_at = Math.floor(Date.now() / 1000) + 3600;
  }
}

async function upsertUser(
  claims: any,
) {
  try {
    // Verificar se o usuário já existe
    const existingUser = await storage.getUser(claims["sub"]);
    const isNewUser = !existingUser;
    
    const user = await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      userType: "aluno", // Default user type for new users
    });
    
    return user;
  } catch (error) {
    console.error('Error upserting user:', error);
    throw error;
  }
}

export async function setupAuth(app: Express) {
  // Check for required environment variables
  if (!REPLIT_DOMAINS || !REPL_ID) {
    throw new Error("Environment variables REPLIT_DOMAINS and REPL_ID are required for Replit Auth");
  }
  
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: any
  ) => {
    try {
      const user: any = {};
      updateUserSession(user, tokens);
      
      const upsertedUser = await upsertUser(tokens.claims());
      
      // Merge the upserted user data with the session data
      Object.assign(user, {
        id: upsertedUser.id,
        email: upsertedUser.email,
        firstName: upsertedUser.firstName,
        lastName: upsertedUser.lastName,
        userType: upsertedUser.userType,
        profileImageUrl: upsertedUser.profileImageUrl
      });
      
      verified(null, user);
    } catch (error) {
      console.error('Error in verification function:', error);
      verified(error, null);
    }
  };

  // Get domains from environment variable
      const domains = REPLIT_DOMAINS!.split(",");
  
  // Add localhost and 127.0.0.1 for development if not already present
  if (!domains.includes('localhost')) {
    domains.push('localhost');
  }
  if (!domains.includes('127.0.0.1')) {
    domains.push('127.0.0.1');
  }

  for (const domain of domains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: domain === 'localhost' 
          ? `http://${domain}:5000/api/callback`
          : `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  (passport as any).serializeUser((user: Express.User, cb: any) => cb(null, user));
  (passport as any).deserializeUser((user: Express.User, cb: any) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Verificar se veio da tela de login personalizada
    const { email, userType, redirect } = req.query;
    
    if (redirect === 'true' && email && userType) {
      // Armazenar dados temporariamente na sessão para uso posterior
      (req.session as any).loginData = { email, userType };
    }
    
    const strategyName = `replitauth:${req.hostname}`;
    
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const strategyName = `replitauth:${req.hostname}`;
    
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/api/auth/redirect",
      failureRedirect: "/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    // Função para finalizar logout e redirecionar
    const finishLogout = () => {
      res.redirect('/multi-login');
    };
    
    // Tentar usar o método logout do Passport se disponível
    if (req.logout && typeof req.logout === 'function') {
      req.logout((err) => {
        if (err) {
          console.error("Erro no logout do Passport:", err);
        }
        
        // Se temos Replit Auth configurado E estamos em produção, fazer logout completo
        if (REPL_ID && client && !req.hostname.includes('localhost')) {
          try {
            const replitLogoutUrl = client.buildEndSessionUrl(config, {
              client_id: REPL_ID!,
              post_logout_redirect_uri: `${req.protocol}://${req.hostname}/multi-login`,
            }).href;
            
            res.redirect(replitLogoutUrl);
            return;
          } catch (replitError) {
            console.error("Erro no logout do Replit:", replitError);
          }
        }
        
        // Fallback: limpar sessão e redirecionar
        if (req.session && req.session.destroy) {
          req.session.destroy((destroyErr) => {
            if (destroyErr) {
              console.error("Erro ao destruir sessão:", destroyErr);
            }
            finishLogout();
          });
        } else {
          finishLogout();
        }
      });
    } else {
      // Se não há método logout, apenas limpar sessão
      if (req.session && req.session.destroy) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Erro ao destruir sessão:", err);
          }
          finishLogout();
        });
      } else {
        finishLogout();
      }
    }
  });
  
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized - Not authenticated" });
  }

  if (!user) {
    return res.status(401).json({ message: "Unauthorized - No user object" });
  }

  // Check if user has required properties
  if (!user.id) {
    return res.status(401).json({ message: "Unauthorized - No user ID" });
  }

  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized - No expires_at" });
  }

  // Ensure expires_at is a valid number
  if (typeof user.expires_at !== 'number' || isNaN(user.expires_at)) {
    return res.status(401).json({ message: "Unauthorized - Invalid expires_at" });
  }

  const now = Math.floor(Date.now() / 1000);
  
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ message: "Unauthorized - Token expired and no refresh token" });
  }

  // TODO: Implement token refresh logic
  return res.status(401).json({ message: "Unauthorized - Token expired, refresh not implemented" });
};
