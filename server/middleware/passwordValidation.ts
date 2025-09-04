import { z } from 'zod';

// Validação de senha forte
export const strongPasswordSchema = z.string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
  .regex(/[^A-Za-z0-9]/, 'A senha deve conter pelo menos um caractere especial');

// Middleware para validar força da senha
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  try {
    strongPasswordSchema.parse(password);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(e => e.message)
      };
    }
    return { isValid: false, errors: ['Erro ao validar senha'] };
  }
};

// Verificar se a senha não contém informações pessoais
export const checkPasswordPersonalInfo = (
  password: string,
  userInfo: { email?: string; firstName?: string; lastName?: string }
): string[] => {
  const errors: string[] = [];
  const lowerPassword = password.toLowerCase();
  
  if (userInfo.email) {
    const emailParts = userInfo.email.toLowerCase().split('@')[0].split('.');
    for (const part of emailParts) {
      if (part.length > 3 && lowerPassword.includes(part)) {
        errors.push('A senha não pode conter partes do seu email');
        break;
      }
    }
  }
  
  if (userInfo.firstName && userInfo.firstName.length > 3) {
    if (lowerPassword.includes(userInfo.firstName.toLowerCase())) {
      errors.push('A senha não pode conter seu nome');
    }
  }
  
  if (userInfo.lastName && userInfo.lastName.length > 3) {
    if (lowerPassword.includes(userInfo.lastName.toLowerCase())) {
      errors.push('A senha não pode conter seu sobrenome');
    }
  }
  
  // Verificar senhas comuns
  const commonPasswords = [
    'password', 'senha', '123456', '12345678', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey', '1234567890'
  ];
  
  if (commonPasswords.some(common => lowerPassword.includes(common))) {
    errors.push('A senha é muito comum e fácil de adivinhar');
  }
  
  return errors;
};