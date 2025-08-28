import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";
import { storage } from "./storage";

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
  
  // Ensure expires_at is properly set
  if (user.claims?.exp) {
    user.expires_at = user.claims.exp;
  } else if (tokens.expires_in) {
    // Fallback: calculate expires_at from expires_in
    user.expires_at = Math.floor(Date.now() / 1000) + tokens.expires_in;
  } else {
    // Default: set expires_at to 1 hour from now
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
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    userType: "aluno", // Default user type for new users
  });
  console.log('✅ User upserted successfully');
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
    verified: passport.AuthenticateCallback
  ) => {
    console.log('✅ Verification function called');
    console.log('🔍 Tokens received:', {
      access_token: !!tokens.access_token,
      refresh_token: !!tokens.refresh_token,
      expires_in: tokens.expires_in
    });
    
    const user: any = {};
    updateUserSession(user, tokens);
    console.log('👤 User session updated, upserting user...');
    await upsertUser(tokens.claims());
    console.log('✅ User upserted successfully');
    
    // Ensure user object has all required properties
    console.log('🔍 Final user object:', {
      claims: !!user.claims,
      access_token: !!user.access_token,
      refresh_token: !!user.refresh_token,
      expires_at: user.expires_at
    });
    
    verified(null, user);
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

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));
  console.log('✅ Passport serialization configured');

  app.get("/api/login", (req, res, next) => {
    console.log('🔐 Login route accessed, hostname:', req.hostname);
    const strategyName = `replitauth:${req.hostname}`;
    console.log('🎯 Using strategy:', strategyName);
    
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log('🔄 Callback route accessed, hostname:', req.hostname);
    const strategyName = `replitauth:${req.hostname}`;
    console.log('🎯 Using strategy:', strategyName);
    
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/api/auth/redirect",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    console.log('🚪 Logout route accessed');
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
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

  if (!user.expires_at) {
    console.log('❌ No expires_at in user object');
    console.log('🔍 User object keys:', Object.keys(user));
    return res.status(401).json({ message: "Unauthorized - No expires_at" });
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
    res.status(401).json({ message: "Unauthorized - Token expired and no refresh token" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    console.log('✅ Token refreshed successfully');
    return next();
  } catch (error) {
    console.log('❌ Token refresh failed:', error);
    res.status(401).json({ message: "Unauthorized - Token refresh failed" });
    return;
  }
};
