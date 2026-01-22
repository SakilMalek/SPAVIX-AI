import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = parseInt(process.env.EMAIL_PORT || '587');

    if (!emailUser || !emailPassword) {
      logger.warn('Email service not configured - using test account for development', {
        hasEmailUser: !!emailUser,
        hasEmailPassword: !!emailPassword,
      });
      
      // Use Ethereal Email for development/testing
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: 'test@ethereal.email',
          pass: 'test123456',
        },
      });
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailPort === 465,
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });
  }

  async sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email service not configured, cannot send password reset email', { email });
      return false;
    }

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested to reset your password. Click the link below to proceed:</p>
          <p>
            <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
              Reset Your Password
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 1 hour. If you didn't request this, please ignore this email.
          </p>
          <p style="color: #666; font-size: 12px;">
            Or copy and paste this link in your browser:<br/>
            ${resetLink}
          </p>
        </div>
      `;

      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_USER || 'noreply@spavix.ai',
        to: email,
        subject: 'Password Reset Request - SPAVIX',
        html: htmlContent,
      });

      logger.info('Password reset email sent successfully', { email, messageId: info.messageId, response: info.response });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to send password reset email', new Error(errorMessage), { email });
      return false;
    }
  }

  async sendWelcomeEmail(email: string, name?: string): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email service not configured, cannot send welcome email', { email });
      return false;
    }

    try {
      const userName = name || 'User';
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to SPAVIX!</h2>
          <p>Hi ${userName},</p>
          <p>Thank you for signing up. We're excited to have you on board!</p>
          <p>You can now start transforming your room designs with our AI-powered platform.</p>
        </div>
      `;

      await this.transporter.sendMail({
        to: email,
        subject: 'Welcome to SPAVIX',
        html: htmlContent,
      });

      logger.info('Welcome email sent successfully', { email });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to send welcome email', new Error(errorMessage), { email });
      return false;
    }
  }
}

export const emailService = new EmailService();
