import { NextRequest, NextResponse } from 'next/server';
import { rateLimitResponseIfExceeded } from '@/lib/api-rate-limit';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { isServerAdminUser } from '@/lib/admin-access';
import { writeAuditLog } from '@/lib/server/audit-log';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(authHeader.slice(7));
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const adminUid = decodedToken.uid;
    const userDoc = await adminDb.collection('users').doc(adminUid).get();
    const userData = userDoc.data();
    if (!isServerAdminUser(userData?.role as string | undefined, decodedToken.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rl = await rateLimitResponseIfExceeded('admin-verify-company', request, {
      windowMs: 60 * 1000,
      max: 25,
      uid: adminUid,
    });
    if (rl) return rl;

    const { companyId, approved } = await request.json();

    if (!companyId || typeof approved !== 'boolean') {
      return NextResponse.json({ 
        error: 'Missing required parameters: companyId, approved' 
      }, { status: 400 });
    }

    const newStatus = approved ? 'verified' : 'rejected';
    const updateData = {
      status: newStatus,
      verifiedAt: new Date().toISOString(),
      verifiedBy: adminUid,
      updatedAt: new Date().toISOString(),
      ...(approved && { isActive: true })
    };

    await adminDb.collection('users').doc(companyId).update(updateData);

    await writeAuditLog({
      eventType: 'admin.verify_company',
      outcome: 'success',
      actorUserId: adminUid,
      actorRole: String(userData?.role || ''),
      targetUserId: companyId,
      metadata: { approved },
      request,
    });

    return NextResponse.json({ 
      success: true, 
      message: `Company ${approved ? 'approved' : 'rejected'} successfully` 
    });

  } catch (error: any) {
    console.error('Error in verify-company API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
