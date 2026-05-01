import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuth } from '@/lib/firebase-admin';
import { parseJobPostingDetailed } from '@/lib/ai/parse-job';
import { rateLimitHit } from '@/lib/api-rate-limit';

export const dynamic = 'force-dynamic';

const parsePreviewSchema = z.object({
  idToken: z.string().min(1),
  title: z.string().min(2),
  description: z.string().min(20),
  tags: z.array(z.string()).default([]),
  location: z.string().optional().nullable(),
  locationCity: z.string().optional().nullable(),
  locationState: z.string().optional().nullable(),
  employment: z.string().optional().nullable(),
  jobType: z.string().optional().nullable(),
  minGpa: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  experienceLevel: z.string().optional().nullable(),
  functionalArea: z.string().optional().nullable(),
  requiredSkillsStructured: z.array(z.string()).default([]),
  preferredSkillsStructured: z.array(z.string()).default([]),
  requiredMajors: z.array(z.string()).default([]),
  preferredMajors: z.array(z.string()).default([]),
  sponsorshipAccepted: z.boolean().nullable().optional(),
  relocationAccepted: z.boolean().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parsePreviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const decoded = await adminAuth.verifyIdToken(data.idToken);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimitHit('job-parse-preview', request, {
      windowMs: 60_000,
      max: 20,
      uid: decoded.uid,
    });
    if (rl != null) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const result = await parseJobPostingDetailed({
      title: data.title,
      description: data.description,
      tags: data.tags,
      location: data.location ?? null,
      locationCity: data.locationCity ?? null,
      locationState: data.locationState ?? null,
      jobType: data.jobType ?? data.employment ?? null,
      minGpa: data.minGpa ?? null,
      industry: data.industry ?? null,
      experienceLevel: data.experienceLevel ?? null,
      functionalArea: data.functionalArea ?? null,
      requiredSkillsStructured: data.requiredSkillsStructured,
      preferredSkillsStructured: data.preferredSkillsStructured,
      requiredMajors: data.requiredMajors,
      preferredMajors: data.preferredMajors,
      sponsorshipAccepted: data.sponsorshipAccepted ?? null,
      relocationAccepted: data.relocationAccepted ?? null,
    });

    return NextResponse.json({
      success: true,
      aiProcessingSource: result.aiProcessingSource,
      parsed: result.processed,
    });
  } catch (error) {
    console.error('[job/parse-preview] failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
