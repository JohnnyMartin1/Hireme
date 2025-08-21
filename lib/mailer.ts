import nodemailer from 'nodemailer';

function appUrl() {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

const devLogOnly = process.env.DEV_EMAIL_LOG === 'true';

async function getTransport() {
  if (devLogOnly || !process.env.SMTP_HOST) {
    // Log emails to the server console (no network)
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
  }

  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER!;
  const pass = process.env.SMTP_PASS!;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = SSL, 587/2525 = STARTTLS
    auth: { user, pass },
  });
}

/**
 * Sends an email verification link. In dev-log mode, it prints the message
 * (including the verify URL) to the server console instead of sending.
 */
export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${appUrl()}/verify?token=${encodeURIComponent(token)}`;

  const transporter = await getTransport();
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'HireMe <no-reply@hireme.local>',
    to: email,
    subject: 'Verify your email',
    text: `Click this link to verify your email: ${verifyUrl}`,
    html: `<p>Click this link to verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });

  if (devLogOnly) {
    console.log('\n--- DEV EMAIL (log only) ---');
    console.log(info.message.toString());
    console.log('---------------------------\n');
  }

  return { ok: true };
}
