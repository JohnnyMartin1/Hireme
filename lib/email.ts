import nodemailer from 'nodemailer';
import { Resend } from 'resend';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Email utility that supports both development and production
 * In dev: logs to console and supports Mailpit/Mailhog if present
 * In prod: uses SMTP credentials from environment
 */
export async function sendMail(options: EmailOptions): Promise<void> {
  const { to, subject, html, text } = options;
  
  // Try to send via Resend first (recommended)
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your_resend_api_key_here') {
    try {
      await sendViaResend(options);
      return;
    } catch (error) {
      console.error('Resend failed, falling back to console logging:', error);
    }
  }
  
  // Try to send via Gmail SMTP (simple setup)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      await sendViaGmail(options);
      return;
    } catch (error) {
      console.error('Gmail failed, falling back to console logging:', error);
    }
  }
  
  // Development mode - log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('\n📧 EMAIL SENT (Development Mode)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('HTML Content:');
    console.log(html);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Try to send via Mailpit/Mailhog if available
    try {
      await sendViaMailpit(options);
    } catch (error) {
      // Ignore errors in dev mode
      console.log('Note: Mailpit/Mailhog not available, email only logged to console');
    }
    return;
  }
  
  // Production mode - use SMTP
  await sendViaSMTP(options);
}

async function sendViaResend(options: EmailOptions): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }
  
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'noreply@hireme.com',
    to: [options.to],
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
  
  console.log(`📧 Email sent via Resend to: ${options.to}`);
}

async function sendViaGmail(options: EmailOptions): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Gmail credentials not configured');
  }
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
  
  console.log(`📧 Email sent via Gmail to: ${options.to}`);
}

async function sendViaMailpit(options: EmailOptions): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'localhost',
    port: parseInt(process.env.EMAIL_PORT || '1025'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
    },
  });
  
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@hireme.local',
    ...options,
  });
}

async function sendViaSMTP(options: EmailOptions): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@hireme.local',
    ...options,
  });
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const verifyUrl = `${baseUrl}/verify?token=${token}`;
  
  await sendMail({
    to: email,
    subject: 'Verify your HireMe email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #226af2; text-align: center;">Welcome to HireMe! 🎉</h1>
        <p>Thanks for signing up! Please verify your email address to get started.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" 
             style="background-color: #226af2; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 14px;">
          If you didn't create a HireMe account, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `Welcome to HireMe! Please verify your email by visiting: ${verifyUrl}`,
  });
}
