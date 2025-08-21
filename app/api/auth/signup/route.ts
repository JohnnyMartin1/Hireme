import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { email, password, role } = body || {};

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    email = email.trim().toLowerCase();
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    // Accept "Job Seeker", "job_seeker", "JOB_SEEKER", etc.
    const normalized = String(role || 'JOB_SEEKER')
      .toUpperCase()
      .replace(/\s+/g, '_');
    const roleEnum = normalized === 'EMPLOYER' ? 'EMPLOYER' : 'JOB_SEEKER';

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'That email is already registered.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, role: roleEnum as any },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.emailToken.create({
      data: { email: user.email, token, expiresAt: expires },
    });

    await sendVerificationEmail(user.email, token);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}

