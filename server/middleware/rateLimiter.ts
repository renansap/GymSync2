import rateLimit from 'express-rate-limit';
import { env, getRateLimitWindowMs, getRateLimitMaxRequests, getAuthRateLimitMaxRequests } from '../config/env';

// Limiter geral para todas as rotas
export const generalLimiter = rateLimit({
  windowMs: getRateLimitWindowMs(),
  max: getRateLimitMaxRequests(),
  message: 'Muitas requisições deste IP, por favor tente novamente mais tarde.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Muitas requisições deste IP, por favor tente novamente mais tarde.',
      retryAfter: Math.round(getRateLimitWindowMs() / 1000 / 60) + ' minutos'
    });
  },
});

// Limiter mais restrito para rotas de autenticação
export const authLimiter = rateLimit({
  windowMs: getRateLimitWindowMs(),
  max: getAuthRateLimitMaxRequests(),
  message: 'Muitas tentativas de autenticação, por favor tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Muitas tentativas de autenticação, por favor tente novamente mais tarde.',
      retryAfter: Math.round(getRateLimitWindowMs() / 1000 / 60) + ' minutos'
    });
  },
});

// Limiter específico para criação de contas
export const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // limite de 3 contas por hora por IP
  message: 'Muitas contas criadas deste IP, por favor tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Muitas contas criadas deste IP, por favor tente novamente em 1 hora.',
      retryAfter: '60 minutos'
    });
  },
});

// Limiter para reset de senha
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // limite de 3 requisições de reset por 15 minutos
  message: 'Muitas tentativas de reset de senha, por favor tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Muitas tentativas de reset de senha, por favor tente novamente em 15 minutos.',
      retryAfter: '15 minutos'
    });
  },
});

// Limiter para endpoints de IA (mais caro)
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // limite de 10 requisições por hora
  message: 'Limite de uso de IA excedido, por favor tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Limite de uso de IA excedido, por favor tente novamente em 1 hora.',
      retryAfter: '60 minutos'
    });
  },
});