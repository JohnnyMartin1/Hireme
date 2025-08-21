import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { threadId, receiverId, body } = await req.json();
  if (!body || !receiverId || !threadId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }
  try {
    await prisma.message.create({
      data: {
        threadId,
        senderId: session.user.id,
        receiverId,
        body,
      },
    });
    // create notification for receiver
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'MESSAGE',
        payload: { threadId, body },
      },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}