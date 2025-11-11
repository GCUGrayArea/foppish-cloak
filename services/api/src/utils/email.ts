/**
 * Email Utility
 *
 * Handles email sending using nodemailer with AWS SES support.
 * Falls back to SMTP for development environments.
 */

import nodemailer, { Transporter } from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Email configuration from environment variables
 */
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from: string;
}

/**
 * Invitation email data
 */
export interface InvitationEmailData {
  firstName: string;
  firmName: string;
  inviterName: string;
  role: string;
  invitationLink: string;
}

/**
 * Email service class
 */
export class EmailService {
  private transporter: Transporter;
  private fromAddress: string;

  constructor() {
    const config = this.getEmailConfig();
    this.fromAddress = config.from;

    // Create transporter
    if (process.env.NODE_ENV === 'production' && process.env.AWS_SES_REGION) {
      // Use AWS SES in production
      this.transporter = nodemailer.createTransport({
        host: `email-smtp.${process.env.AWS_SES_REGION}.amazonaws.com`,
        port: 587,
        secure: false, // Use STARTTLS
        auth: {
          user: process.env.AWS_SES_SMTP_USER || '',
          pass: process.env.AWS_SES_SMTP_PASSWORD || ''
        }
      });
    } else {
      // Use SMTP for development
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth
      });
    }
  }

  /**
   * Get email configuration from environment variables
   */
  private getEmailConfig(): EmailConfig {
    return {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || ''
      } : undefined,
      from: process.env.EMAIL_FROM || 'noreply@demandletter.app'
    };
  }

  /**
   * Send invitation email
   *
   * @param to - Recipient email address
   * @param data - Invitation email data
   */
  async sendInvitationEmail(to: string, data: InvitationEmailData): Promise<void> {
    const html = this.renderInvitationTemplate(data);

    await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject: `You're invited to join ${data.firmName}`,
      html
    });

    console.log(`Invitation email sent to ${to}`);
  }

  /**
   * Render invitation email template
   *
   * @param data - Template data
   * @returns Rendered HTML
   */
  private renderInvitationTemplate(data: InvitationEmailData): string {
    // Load template file
    const templatePath = join(__dirname, '../templates/invitation-email.html');
    let template: string;

    try {
      template = readFileSync(templatePath, 'utf-8');
    } catch (error) {
      // Fallback to inline template if file not found
      template = this.getDefaultInvitationTemplate();
    }

    // Simple template variable replacement
    return template
      .replace(/\{\{firstName\}\}/g, data.firstName)
      .replace(/\{\{firmName\}\}/g, data.firmName)
      .replace(/\{\{inviterName\}\}/g, data.inviterName)
      .replace(/\{\{role\}\}/g, data.role)
      .replace(/\{\{invitationLink\}\}/g, data.invitationLink);
  }

  /**
   * Default invitation template (fallback)
   */
  private getDefaultInvitationTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>You're invited to join {{firmName}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #003366;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .button {
      display: inline-block;
      background-color: #003366;
      color: white !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>You've been invited!</h1>
  </div>
  <div class="content">
    <p>Hi {{firstName}},</p>
    <p>{{inviterName}} has invited you to join <strong>{{firmName}}</strong> on the Demand Letter Generator platform.</p>
    <p>You've been invited as a <strong>{{role}}</strong>.</p>
    <p style="text-align: center;">
      <a href="{{invitationLink}}" class="button">Accept Invitation</a>
    </p>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #0066cc;">{{invitationLink}}</p>
    <p><strong>This invitation will expire in 7 days.</strong></p>
    <p>If you didn't expect this invitation, you can safely ignore this email.</p>
  </div>
  <div class="footer">
    <p>Steno Demand Letter Generator</p>
    <p>© 2025 All rights reserved</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Verify email configuration
   * Useful for testing connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email service ready');
      return true;
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }
}

/**
 * Singleton instance
 */
let emailService: EmailService | null = null;

/**
 * Get or create email service instance
 */
export function getEmailService(): EmailService {
  if (!emailService) {
    emailService = new EmailService();
  }
  return emailService;
}

/**
 * Send invitation email (convenience function)
 */
export async function sendInvitationEmail(
  to: string,
  data: InvitationEmailData
): Promise<void> {
  const service = getEmailService();
  await service.sendInvitationEmail(to, data);
}
