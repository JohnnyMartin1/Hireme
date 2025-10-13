import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { companyId, approved, adminUserId } = await request.json();

    if (!companyId || typeof approved !== 'boolean' || !adminUserId) {
      return NextResponse.json({ 
        error: 'Missing required parameters: companyId, approved, adminUserId' 
      }, { status: 400 });
    }

    const newStatus = approved ? 'verified' : 'rejected';
    const updateData = {
      status: newStatus,
      verifiedAt: new Date().toISOString(),
      verifiedBy: adminUserId,
      updatedAt: new Date().toISOString(),
      // If approved, also set isActive to true to grant full access
      ...(approved && { isActive: true })
    };

    // Update the user document using Firebase Admin SDK
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
