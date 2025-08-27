import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Endpoint: POST /api/uploads/complete
 * Body: { key: string, type: 'resume' | 'video' }
 * After uploading, call this to update the user's profile URL.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { key, type } = await req.json().catch(() => ({ key: null, type: null }));
  if (!key || !type) {
    return NextResponse.json({ error: 'Missing key or type' }, { status: 400 });
  }
  try {
    if (!['resume', 'video'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    const data: any = {};
    if (type === 'resume') data.resumeUrl = key;
    if (type === 'video') data.videoUrl = key;
    const profile = await prisma.profile.update({ where: { userId }, data });
    return NextResponse.json({ ok: true, profile });
  } catch (e: any) {
    console.error('Upload complete error', e);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}