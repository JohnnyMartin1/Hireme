import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

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
    const adminEmail = process.env.ADMIN_EMAIL || 'officialhiremeapp@gmail.com';
    const userDoc = await adminDb.collection('users').doc(adminUid).get();
    const userData = userDoc.data();
    const isAdmin = userData?.role === 'ADMIN' || decodedToken.email === adminEmail;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

    return NextResponse.json({ 
      success: true, 
      message: `Company ${approved ? 'approved' : 'rejected'} successfully` 
    });

  } catch (error: any) {
    console.error('Error in verify-company API:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to update company status' 
    }, { status: 500 });
  }
}
