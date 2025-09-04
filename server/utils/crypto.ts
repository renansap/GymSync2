import crypto from 'crypto';
import { env } from '../config/env';

// Gerar token seguro para reset de senha
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Gerar hash do token para armazenar no banco
export function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

// Verificar se o token corresponde ao hash
export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  return crypto.timingSafeEqual(
    Buffer.from(tokenHash),
    Buffer.from(hash)
  );
}

// Gerar código de verificação numérico
export function generateVerificationCode(length: number = 6): string {
  const max = Math.pow(10, length) - 1;
  const min = Math.pow(10, length - 1);
  const code = crypto.randomInt(min, max);
  return code.toString();
}

// Criptografar dados sensíveis
export function encrypt(text: string): { iv: string; encryptedData: string } {
  const algorithm = 'aes-256-ctr';
  const secretKey = crypto
    .createHash('sha256')
    .update(env.SESSION_SECRET)
    .digest();
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted.toString('hex')
  };
}

// Descriptografar dados sensíveis
export function decrypt(hash: { iv: string; encryptedData: string }): string {
  const algorithm = 'aes-256-ctr';
  const secretKey = crypto
    .createHash('sha256')
    .update(env.SESSION_SECRET)
    .digest();
  
  const decipher = crypto.createDecipheriv(
    algorithm,
    secretKey,
    Buffer.from(hash.iv, 'hex')
  );
  
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(hash.encryptedData, 'hex')),
    decipher.final()
  ]);
  
  return decrypted.toString();
}

// Gerar hash seguro para senhas (alternativa ao bcrypt)
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ':' + derivedKey.toString('hex'));
    });
  });
}

// Verificar senha com hash PBKDF2
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey));
    });
  });
}