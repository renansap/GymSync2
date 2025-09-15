import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupPassport, setupAuthRoutes } from "./auth";
import { setupAuth as setupReplitAuth } from "./replitAuth";
import { env, getPort, isProduction, isDevelopment } from "./config/env";
import { generalLimiter } from "./middleware/rateLimiter";
import { helmetConfig, corsConfig, securityHeaders } from "./middleware/security";
import "./db"; // Initialize database connection

const app = express();

// Apply security middlewares
app.use(helmetConfig);
app.use(corsConfig);
app.use(securityHeaders);

// Apply general rate limiting only to API routes (avoid blocking HTML/Vite assets)
app.use('/api', generalLimiter);

app.use(express.json({ limit: '10mb' })); // Limitar tamanho do body
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Configurar sessões
app.use(session({
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: 'lax'
  },
  name: 'gymsync.sid'
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Setup authentication first, before any routes
  console.log('🔧 Starting authentication setup...');
  console.log('📝 Configurando Passport...');
  setupPassport(app);
  console.log('📝 Configurando rotas de autenticação...');
  setupAuthRoutes(app);
  // Setup Replit Auth only if environment variables are available
  if (env.REPLIT_DOMAINS && env.REPL_ID) {
    console.log('📝 Configurando Replit Auth...');
    try {
      await setupReplitAuth(app);
      console.log('✅ Replit Auth configurado');
    } catch (error) {
      console.warn('⚠️ Falha ao configurar Replit Auth:', error);
    }
  } else {
    console.log('ℹ️ Replit Auth desabilitado (variáveis de ambiente não encontradas)');
  }
  console.log('✅ Authentication setup completed');
  console.log('🔍 Verificando configuração de sessões...');
  console.log('📋 Session middleware configurado:', !!app._router.stack.find((layer: any) => layer.name === 'session'));

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (isDevelopment) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = getPort();
  server.listen({
    port,
    host: "127.0.0.1",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
