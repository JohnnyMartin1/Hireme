import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const form = await req.formData();
  const file = form.get('file') as unknown as File;
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'videos');
  await fs.mkdir(uploadsDir, { recursive: true });
  const fileName = `${session.user.id}-${Date.now()}.mp4`;
  const filePath = path.join(uploadsDir, fileName);
  await fs.writeFile(filePath, buffer);
  const videoUrl = `/uploads/videos/${fileName}`;
  await prisma.profile.update({ where: { userId: session.user.id }, data: { videoUrl } });
  return NextResponse.json({ success: true, videoUrl });
}