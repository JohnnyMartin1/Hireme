import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { 
      title, 
      description, 
      locationCity, 
      locationState, 
      employment, 
      workMode,
      salaryMin, 
      salaryMax, 
      tags, 
      requiredGpa,
      requiredCareerInterests,
      employerId, 
      companyId,
      companyName,
      companyWebsite,
      idToken 
    } = body;

    // Validate required fields
    if (!title || !description || !employerId) {
      return NextResponse.json({ error: 'Title, description, and employer ID are required' }, { status: 400 });
    }

    // Verify Firebase ID token
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    if (!decoded || decoded.uid !== employerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create job data
    const jobData = {
      title,
      description,
      locationCity: locationCity || '',
      locationState: locationState || '',
      employment: employment || 'FULL_TIME',
      workMode: workMode || null,
      salaryMin: salaryMin || null,
      salaryMax: salaryMax || null,
      tags: tags || [],
      skills: tags || [], // Map tags to skills for backward compatibility
      requiredGpa: requiredGpa || null,
      requiredCareerInterests: requiredCareerInterests || [],
      employerId,
      companyId: companyId || null,
      companyName: companyName || null,
      companyWebsite: companyWebsite || null,
      postedDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      createdAt: new Date(),
      status: 'ACTIVE'
    };

    // Save to Firestore with Admin privileges
    const docRef = await adminDb.collection('jobs').add(jobData as any);

    return NextResponse.json({ 
      success: true, 
      jobId: docRef.id,
      message: 'Job created successfully' 
    });

  } catch (error) {
    console.error('Error in job creation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
