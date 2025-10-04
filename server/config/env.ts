import { z } from 'zod';

// Define schema for environment variables
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Security
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET deve ter pelo menos 32 caracteres'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres').optional(),
  
  // API Keys
  SENDGRID_API_KEY: z.string().startsWith('SG.', 'SENDGRID_API_KEY deve começar com SG.'),
  OPENAI_API_KEY: z.string().optional(),
  
  // Google OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Replit Auth (optional)
  REPLIT_DOMAINS: z.string().optional(),
  REPL_ID: z.string().optional(),
  ISSUER_URL: z.string().url().optional().default('https://replit.com/oidc'),
  
  // Application
  PORT: z.string().regex(/^\d+$/, 'PORT deve ser um número').default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Redis (optional for now, but recommended for production)
  REDIS_URL: z.string().url().optional(),
  
  // Frontend URL (for CORS)
  FRONTEND_URL: z.string().url().optional().default('http://localhost:5000'),
  
  // Email Configuration
  EMAIL_FROM: z.string().email().optional().default('noreply@gymsync.com'),
  EMAIL_FROM_NAME: z.string().optional().default('GymSync'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).optional().default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).optional().default('100'),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).optional().default('5'),
  
  // Password Reset
  PASSWORD_RESET_TOKEN_EXPIRES_IN: z.string().optional().default('1h'),
});

// Validate environment variables
function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Erro na validação das variáveis de ambiente:');
      error.errors.forEach((err) => {
        console.error(`   - ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\n💡 Dica: Copie o arquivo env.example para .env e configure as variáveis necessárias.');
      process.exit(1);
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// Helper to check if we're in production
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

// Helper to get numeric values
export const getPort = () => parseInt(env.PORT, 10);
export const getRateLimitWindowMs = () => parseInt(env.RATE_LIMIT_WINDOW_MS, 10);
export const getRateLimitMaxRequests = () => parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10);
export const getAuthRateLimitMaxRequests = () => parseInt(env.AUTH_RATE_LIMIT_MAX_REQUESTS, 10);