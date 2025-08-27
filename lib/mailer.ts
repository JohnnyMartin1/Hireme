import nodemailer from 'nodemailer';

/**
 * Sends an email verification link to the specified address. The SMTP
 * credentials and from-address are taken from environment variables:
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and EMAIL_FROM. The URL
 * for verification is built using NEXTAUTH_URL and the provided token.
 */
export async function sendVerificationEmail(email: string, token: string) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;
  const baseUrl = process.env.NEXTAUTH_URL;
  if (!host || !user || !pass || !from || !baseUrl) {
    throw new Error('SMTP or NEXTAUTH_URL environment variables not set');
  }
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass },
  });
  const verifyUrl = `${baseUrl}/verify?token=${token}`;
  await transporter.sendMail({
    from,
    to: email,
    subject: 'Verify your HireMe email',
    text: `Welcome to HireMe! Please verify your email by visiting this link: ${verifyUrl}`,
    html: `<p>Welcome to HireMe!</p><p>Please verify your email by clicking <a href="${verifyUrl}">here</a>.</p>`,
  });
}