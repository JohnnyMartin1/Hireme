import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPresignedUrl } from '@/lib/s3';

/**
 * Endpoint: POST /api/uploads/presign
 * Body: { key: string, contentType: string }
 * Returns a presigned URL to upload the file directly to S3.
 * Only authenticated users may request a presigned URL.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { key, contentType } = await req.json().catch(() => ({ key: null, contentType: null }));
  if (!key || !contentType) {
    return NextResponse.json({ error: 'Missing key or contentType' }, { status: 400 });
  }
  try {
    const url = await getPresignedUrl(key, contentType);
    return NextResponse.json({ url });
  } catch (e: any) {
    console.error('Error generating presigned URL', e);
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
  }
}