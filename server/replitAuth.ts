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

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    console.log('🔧 Getting OIDC config');
    const config = await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
    console.log('✅ OIDC config retrieved');
    return config;
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  console.log('🔧 Setting up session configuration');
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Always use memory store for now - database configuration can be added later
  const Store = MemoryStore(session);
  const sessionStore = new Store({
    checkPeriod: 86400000, // prune expired entries every 24h
  });
  console.log("🔧 Using memory store for sessions");
  
  const sessionConfig = session({
    secret: process.env.SESSION_SECRET || "default-secret-key-for-development",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to false for local development
      maxAge: sessionTtl,
    },
  });
  
  console.log('✅ Session configuration complete');
  return sessionConfig;
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  console.log('🔄 Updating user session with tokens');
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
    console.warn('⚠️ Invalid expires_at, setting to default 1 hour');
    user.expires_at = Math.floor(Date.now() / 1000) + 3600;
  }
  
  console.log('✅ User session updated, expires_at:', user.expires_at);
  console.log('🔍 Claims:', user.claims);
  console.log('🔍 Tokens:', {
    access_token: !!user.access_token,
    refresh_token: !!user.refresh_token,
    expires_in: tokens.expires_in
  });
}

async function upsertUser(
  claims: any,
) {
  console.log('🔄 Upserting user with claims:', claims);
  
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
    
    console.log('✅ User upserted successfully');
    
    // Se for um novo usuário, logar mas não enviar email por enquanto
    if (isNewUser) {
      console.log('🎉 New user detected:', {
        id: user.id,
        email: user.email,
        userType: user.userType
      });
      
      // TODO: Implementar envio de email de boas-vindas de forma assíncrona
      console.log('📧 Welcome email functionality temporarily disabled for debugging');
    }
    
    return user;
  } catch (error) {
    console.error('❌ Error upserting user:', error);
    throw error;
  }
}

export async function setupAuth(app: Express) {
  console.log('🔧 Setting up authentication');
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  console.log('✅ Passport initialized');

  const config = await getOidcConfig();
  console.log('✅ OIDC config loaded');

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: any
  ) => {
    console.log('✅ Verification function called');
    console.log('🔍 Tokens received:', {
      access_token: !!tokens.access_token,
      refresh_token: !!tokens.refresh_token,
      expires_in: tokens.expires_in
    });
    
    try {
      const user: any = {};
      updateUserSession(user, tokens);
      console.log('👤 User session updated, upserting user...');
      
      const upsertedUser = await upsertUser(tokens.claims());
      console.log('✅ User upserted successfully');
      
      // Merge the upserted user data with the session data
      Object.assign(user, {
        id: upsertedUser.id,
        email: upsertedUser.email,
        firstName: upsertedUser.firstName,
        lastName: upsertedUser.lastName,
        userType: upsertedUser.userType,
        profileImageUrl: upsertedUser.profileImageUrl
      });
      
      // Ensure user object has all required properties
      console.log('🔍 Final user object:', {
        id: user.id,
        email: user.email,
        userType: user.userType,
        claims: !!user.claims,
        access_token: !!user.access_token,
        refresh_token: !!user.refresh_token,
        expires_at: user.expires_at
      });
      
      verified(null, user);
    } catch (error) {
      console.error('❌ Error in verification function:', error);
      verified(error, null);
    }
  };

  // Get domains from environment variable
  const domains = process.env.REPLIT_DOMAINS!.split(",");
  
  // Add localhost for development if not already present
  if (!domains.includes('localhost')) {
    domains.push('localhost');
  }
  
  console.log('🌐 Domains to configure:', domains);

  for (const domain of domains) {
    console.log('🌐 Setting up strategy for domain:', domain);
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
    console.log('✅ Strategy added for domain:', domain);
  }

  (passport as any).serializeUser((user: Express.User, cb: any) => cb(null, user));
  (passport as any).deserializeUser((user: Express.User, cb: any) => cb(null, user));
  console.log('✅ Passport serialization configured');

  app.get("/api/login", (req, res, next) => {
    console.log('🔐 Login route accessed, hostname:', req.hostname);
    console.log('📧 Query params:', req.query);
    
    // Verificar se veio da tela de login personalizada
    const { email, userType, redirect } = req.query;
    
    if (redirect === 'true' && email && userType) {
      console.log('✅ Login personalizado detectado:', { email, userType });
      // Armazenar dados temporariamente na sessão para uso posterior
      (req.session as any).loginData = { email, userType };
    }
    
    const strategyName = `replitauth:${req.hostname}`;
    console.log('🎯 Using strategy:', strategyName);
    
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log('🔄 Callback route accessed, hostname:', req.hostname);
    console.log('📧 Session login data:', (req.session as any)?.loginData);
    
    const strategyName = `replitauth:${req.hostname}`;
    console.log('🎯 Using strategy:', strategyName);
    
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/api/auth/redirect",
      failureRedirect: "/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    console.log('🚪 Logout route accessed');
    req.logout(() => {
      // Primeiro redirecionar para o logout do Replit
      const replitLogoutUrl = client.buildEndSessionUrl(config, {
        client_id: process.env.REPL_ID!,
        post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
      }).href;
      
      console.log('🔄 Redirecionando para logout do Replit:', replitLogoutUrl);
      
      // Redirecionar para o portal principal após o logout
      res.redirect('/');
    });
  });
  
  console.log('✅ Authentication setup complete');
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  console.log('🔒 isAuthenticated middleware called');
  console.log('🔍 req.isAuthenticated():', req.isAuthenticated());
  console.log('🔍 req.user:', req.user);
  
  const user = req.user as any;
  console.log('👤 User from request:', user);

  if (!req.isAuthenticated()) {
    console.log('❌ User not authenticated (req.isAuthenticated() returned false)');
    return res.status(401).json({ message: "Unauthorized - Not authenticated" });
  }

  if (!user) {
    console.log('❌ No user object in request');
    return res.status(401).json({ message: "Unauthorized - No user object" });
  }

  // Check if user has required properties
  if (!user.id) {
    console.log('❌ No user ID in user object');
    return res.status(401).json({ message: "Unauthorized - No user ID" });
  }

  if (!user.expires_at) {
    console.log('❌ No expires_at in user object');
    console.log('🔍 User object keys:', Object.keys(user));
    return res.status(401).json({ message: "Unauthorized - No expires_at" });
  }

  // Ensure expires_at is a valid number
  if (typeof user.expires_at !== 'number' || isNaN(user.expires_at)) {
    console.log('❌ Invalid expires_at value:', user.expires_at);
    return res.status(401).json({ message: "Unauthorized - Invalid expires_at" });
  }

  const now = Math.floor(Date.now() / 1000);
  console.log('🕐 Current time:', now, 'Expires at:', user.expires_at);
  
  if (now <= user.expires_at) {
    console.log('✅ User authenticated, proceeding');
    return next();
  }

  console.log('🔄 Token expired, attempting refresh');
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    console.log('❌ No refresh token available');
    return res.status(401).json({ message: "Unauthorized - Token expired and no refresh token" });
  }

  // TODO: Implement token refresh logic
  console.log('⚠️ Token refresh not implemented yet');
  return res.status(401).json({ message: "Unauthorized - Token expired, refresh not implemented" });
};
