import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }
    const emailToken = await prisma.emailToken.findUnique({ where: { token } });
    if (!emailToken || emailToken.usedAt || emailToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }
    // Mark token as used
    await prisma.emailToken.update({ where: { token }, data: { usedAt: new Date() } });
    // Mark user as verified
    await prisma.user.update({
      where: { email: emailToken.email },
      data: { emailVerified: new Date() },
    });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}