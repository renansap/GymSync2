# Atualização de Tokens nas Rotas

## Mudanças necessárias:

### Antes:
```typescript
const welcomeToken = emailService.generatePasswordResetToken();
await storage.setPasswordResetToken(aluno.id, welcomeToken, expires);
```

### Depois:
```typescript
const { token, hash } = emailService.generatePasswordResetToken();
await storage.setPasswordResetToken(aluno.id, hash, expires);
// Usar 'token' para enviar no email
```

## Locais para atualizar:
- server/routes.ts linha 460
- server/routes.ts linha 522
- server/routes.ts linha 622
- server/routes.ts linha 883
- server/routes.ts linha 1143