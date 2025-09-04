import sgMail from '@sendgrid/mail';
import { env } from './config/env';
import { generateSecureToken, hashToken } from './utils/crypto';

sgMail.setApiKey(env.SENDGRID_API_KEY);

// Interface para token de reset
interface ResetTokenData {
  token: string;
  hash: string;
}

interface EmailData {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private fromEmail = 'noreply@gymsync.app'; // Altere para seu domínio verificado

  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      const msg = {
        to: emailData.to,
        from: this.fromEmail,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || this.stripHtml(emailData.html),
      };

      await sgMail.send(msg);
      console.log(`📧 Email sent successfully to ${emailData.to}`);
      return true;
    } catch (error) {
      console.error('📧 SendGrid email error:', error);
      return false;
    }
  }

  generatePasswordResetToken(): ResetTokenData {
    const token = generateSecureToken(32);
    const hash = hashToken(token);
    return { token, hash };
  }

  async sendWelcomeEmail(
    userEmail: string, 
    userName: string, 
    userType: string, 
    resetToken: string,
    template: { subject: string; content: string }
  ): Promise<boolean> {
    const resetLink = `${process.env.REPLIT_DOMAIN || 'http://localhost:5000'}/definir-senha?token=${resetToken}`;
    
    // Substituir variáveis do template
    let subject = template.subject
      .replace(/\{\{nome\}\}/g, userName)
      .replace(/\{\{email\}\}/g, userEmail)
      .replace(/\{\{tipo\}\}/g, this.getUserTypeLabel(userType));

    let content = template.content
      .replace(/\{\{nome\}\}/g, userName)
      .replace(/\{\{email\}\}/g, userEmail)
      .replace(/\{\{tipo\}\}/g, this.getUserTypeLabel(userType))
      .replace(/\{\{link_senha\}\}/g, resetLink);

    const htmlContent = this.createEmailHtml(content, subject);

    return await this.sendEmail({
      to: userEmail,
      from: "noreply@gymsync.com", // Default from address
      subject: subject,
      html: htmlContent,
    });
  }

  async sendTestEmail(
    userEmail: string, 
    userType: string, 
    templateType: string,
    template: { subject: string; content: string }
  ): Promise<boolean> {
    // Para emails de teste, usamos dados fictícios
    const testUserName = 'Usuário Teste';
    const testResetToken = this.generatePasswordResetToken();
    const resetLink = `${process.env.REPLIT_DOMAIN || 'http://localhost:5000'}/definir-senha?token=${testResetToken}`;
    
    // Substituir variáveis do template
    let subject = template.subject
      .replace(/\{\{nome\}\}/g, testUserName)
      .replace(/\{\{email\}\}/g, userEmail)
      .replace(/\{\{tipo\}\}/g, this.getUserTypeLabel(userType));

    let content = template.content
      .replace(/\{\{nome\}\}/g, testUserName)
      .replace(/\{\{email\}\}/g, userEmail)
      .replace(/\{\{tipo\}\}/g, this.getUserTypeLabel(userType))
      .replace(/\{\{link_senha\}\}/g, resetLink);

    const htmlContent = this.createEmailHtml(content, subject);

    return await this.sendEmail({
      to: userEmail,
      from: "noreply@gymsync.com", // Default from address
      subject: `[TESTE] ${subject}`,
      html: htmlContent,
    });
  }

  async sendPasswordResetEmail(
    userEmail: string, 
    userName: string, 
    resetToken: string
  ): Promise<boolean> {
    const resetLink = `${process.env.REPLIT_DOMAIN || 'http://localhost:5000'}/redefinir-senha?token=${resetToken}`;
    
    const subject = 'Redefinição de Senha - GymSync';
    const content = `
      <h2>Redefinição de Senha</h2>
      <p>Olá ${userName},</p>
      <p>Você solicitou a redefinição de sua senha no GymSync.</p>
      <p>Clique no link abaixo para definir uma nova senha:</p>
      <p><a href="${resetLink}" class="button">Redefinir Senha</a></p>
      <p>Este link expira em 1 hora.</p>
      <p>Se você não solicitou esta redefinição, ignore este email.</p>
    `;

    const htmlContent = this.createEmailHtml(content, subject);

    return await this.sendEmail({
      to: userEmail,
      from: "noreply@gymsync.com", // Default from address
      subject: subject,
      html: htmlContent,
    });
  }

  async sendCustomEmail(
    userEmail: string,
    subject: string,
    content: string,
    variables?: Record<string, string>
  ): Promise<boolean> {
    // Substituir variáveis personalizadas se fornecidas
    let processedContent = content;
    let processedSubject = subject;
    
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processedContent = processedContent.replace(regex, value);
        processedSubject = processedSubject.replace(regex, value);
      });
    }

    const htmlContent = this.createEmailHtml(processedContent, processedSubject);

    return await this.sendEmail({
      to: userEmail,
      from: "noreply@gymsync.com", // Default from address
      subject: processedSubject,
      html: htmlContent,
    });
  }

  private getUserTypeLabel(type: string): string {
    const types = {
      'aluno': 'Aluno',
      'personal': 'Personal Trainer',
      'academia': 'Academia/Admin'
    };
    return types[type as keyof typeof types] || type;
  }

  private createEmailHtml(content: string, title: string): string {
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-top: 20px;
            margin-bottom: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #4F46E5;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #4F46E5;
            margin-bottom: 10px;
          }
          .content {
            margin-bottom: 30px;
          }
          .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
          }
          a {
            color: #4F46E5;
            text-decoration: none;
          }
          .button {
            background-color: #4F46E5;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            display: inline-block;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏋️ GymSync</div>
            <p>Sistema de Gestão Fitness</p>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>Este email foi enviado automaticamente pelo sistema GymSync.</p>
            <p>Se você tem dúvidas, entre em contato conosco.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

export const emailService = new EmailService();