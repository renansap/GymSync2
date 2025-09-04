import helmet from 'helmet';
import cors from 'cors';
import { env, isProduction, isDevelopment } from '../config/env';

// Configuração do Helmet para headers de segurança
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval necessário para desenvolvimento
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.openai.com", "wss:", "ws:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
    },
  },
  crossOriginEmbedderPolicy: !isDevelopment, // Desabilitar em desenvolvimento para hot reload
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Configuração do CORS
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5173', // Vite default
];

// Adicionar domínios do Replit se disponíveis
if (env.REPLIT_DOMAINS) {
  const replitDomains = env.REPLIT_DOMAINS.split(',').map(domain => {
    return [
      `https://${domain}`,
      `https://${domain}:443`,
      `http://${domain}`,
      `http://${domain}:80`
    ];
  }).flat();
  allowedOrigins.push(...replitDomains);
}

export const corsConfig = cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (ex: Postman, aplicações mobile)
    if (!origin) {
      return callback(null, true);
    }

    // Em desenvolvimento, ser mais permissivo
    if (isDevelopment) {
      return callback(null, true);
    }

    // Em produção, verificar contra lista de origens permitidas
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true, // Permitir cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400, // Cache de preflight por 24 horas
});

// Headers de segurança adicionais
export const securityHeaders = (req: any, res: any, next: any) => {
  // Prevenir clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevenir MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Habilitar XSS filter do navegador
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Remover header que expõe informações do servidor
  res.removeHeader('X-Powered-By');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (substitui Feature Policy)
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
};