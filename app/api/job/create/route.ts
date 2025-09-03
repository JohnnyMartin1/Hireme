import { NextRequest, NextResponse } from 'next/server';
import { createDocument } from '@/lib/firebase-firestore';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { title, description, locationCity, locationState, employment, salaryMin, salaryMax, tags, employerId } = body;

    // Validate required fields
    if (!title || !description || !employerId) {
      return NextResponse.json({ error: 'Title, description, and employer ID are required' }, { status: 400 });
    }

    // Create job data
    const jobData = {
      title,
      description,
      locationCity: locationCity || '',
      locationState: locationState || '',
      employment: employment || 'FULL_TIME',
      salaryMin: salaryMin || null,
      salaryMax: salaryMax || null,
      tags: tags || [],
      employerId,
      createdAt: new Date(),
      status: 'ACTIVE'
    };

    // Save to Firebase
    const { id, error } = await createDocument('jobs', jobData);
    
    if (error) {
      console.error('Error creating job:', error);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      jobId: id,
      message: 'Job created successfully' 
    });

  } catch (error) {
    console.error('Error in job creation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
