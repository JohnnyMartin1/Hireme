import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  // Check if the user is an employer
  const employer = await prisma.employer.findUnique({ where: { userId } });
  if (!employer) {
    return NextResponse.json({ error: 'Only employers can post jobs' }, { status: 403 });
  }
  const { title, description, locationCity, locationState, employment, salaryMin, salaryMax, tags } = await req.json();
  try {
    await prisma.job.create({
      data: {
        employerId: employer.id,
        title,
        description,
        locationCity,
        locationState,
        employment,
        salaryMin,
        salaryMax,
        tags,
      },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}