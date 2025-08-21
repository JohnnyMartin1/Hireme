import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { companyName, website, industry, about } = await req.json();
  try {
    await prisma.employer.upsert({
      where: { userId },
      update: { companyName, website, industry, about },
      create: { userId, companyName, website, industry, about },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update employer' }, { status: 500 });
  }
}