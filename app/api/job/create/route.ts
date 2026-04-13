import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { createJobBodySchema } from '@/lib/validation/job';
import { parseJobPostingDetailed } from '@/lib/ai/parse-job';
import { runJobMatching } from '@/lib/matching/job-matching';

export const dynamic = 'force-dynamic';

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)).filter((item) => item !== undefined) as T;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, stripUndefinedDeep(v)]);
    return Object.fromEntries(entries) as T;
  }
  return value;
}

/**
 * Create a job (Firestore). Runs optional AI normalization, then match generation async.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createJobBodySchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ error: 'Validation failed', details: msg }, { status: 400 });
    }

    const {
      title,
      description,
      locationCity,
      locationState,
      location: locationLine,
      employment,
      jobType,
      workMode,
      salaryMin,
      salaryMax,
      tags,
      requiredGpa,
      minGpa,
      requiredCareerInterests,
      industry,
      experienceLevel,
      functionalArea,
      requiredSkillsStructured,
      preferredSkillsStructured,
      requiredMajors,
      preferredMajors,
      sponsorshipAccepted,
      relocationAccepted,
      employerId,
      companyId,
      companyName,
      companyWebsite,
      status,
      idToken,
    } = parsed.data;

    const decoded = await adminAuth.verifyIdToken(idToken);
    if (!decoded || decoded.uid !== employerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const effectiveMinGpa = minGpa ?? requiredGpa ?? null;
    const effectiveJobType = jobType ?? employment;

    const combinedLocation =
      locationLine?.trim() ||
      [locationCity, locationState].filter(Boolean).join(', ') ||
      '';

    const parseResult = await parseJobPostingDetailed({
      title,
      description,
      tags,
      location: combinedLocation,
      locationCity,
      locationState,
      jobType: effectiveJobType || employment || null,
      minGpa: effectiveMinGpa,
      industry: industry ?? null,
      experienceLevel: experienceLevel ?? null,
      functionalArea: functionalArea ?? null,
      requiredSkillsStructured,
      preferredSkillsStructured,
      requiredMajors,
      preferredMajors,
      sponsorshipAccepted: sponsorshipAccepted ?? null,
      relocationAccepted: relocationAccepted ?? null,
    });
    const processed = parseResult.processed;

    const finalMinGpa = effectiveMinGpa ?? processed.minGpa ?? null;

    const jobData: Record<string, unknown> = {
      title,
      description,
      locationCity: locationCity || '',
      locationState: locationState || '',
      location: combinedLocation || null,
      employment: employment || 'FULL_TIME',
      jobType: effectiveJobType || employment || 'FULL_TIME',
      workMode: workMode || null,
      salaryMin: salaryMin ?? null,
      salaryMax: salaryMax ?? null,
      tags,
      skills: tags,
      requiredGpa: requiredGpa ?? finalMinGpa,
      minGpa: finalMinGpa,
      requiredCareerInterests: requiredCareerInterests || [],
      industry: industry ?? null,
      experienceLevel: experienceLevel ?? processed.experienceLevel ?? null,
      functionalArea: functionalArea ?? processed.functionalArea ?? null,
      requiredSkillsStructured: requiredSkillsStructured || [],
      preferredSkillsStructured: preferredSkillsStructured || [],
      requiredMajors: requiredMajors || [],
      preferredMajors: preferredMajors || [],
      sponsorshipAccepted: sponsorshipAccepted ?? null,
      relocationAccepted: relocationAccepted ?? null,
      employerId,
      companyId: companyId ?? null,
      companyName: companyName ?? null,
      companyWebsite: companyWebsite ?? null,
      postedDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      createdAt: new Date(),
      status: status || 'ACTIVE',
      normalizedTitle: processed.normalizedTitle,
      canonicalRole: processed.canonicalRole,
      roleFamily: processed.roleFamily,
      roleSpecialization: processed.roleSpecialization,
      hardRequirements: processed.hardRequirements,
      softRequirements: processed.softRequirements,
      requiredTools: processed.requiredTools,
      domainKeywords: processed.domainKeywords,
      experienceRequirements: processed.experienceRequirements,
      educationRequirements: processed.educationRequirements,
      aiSummary: processed.aiSummary,
      requiredSkills: processed.requiredSkills,
      preferredSkills: processed.preferredSkills,
      seniorityLevel: processed.seniorityLevel,
      keywords: processed.keywords,
      mustHaves: processed.mustHaves,
      niceToHaves: processed.niceToHaves,
      jobFunctions: processed.jobFunctions,
      industries: processed.industries,
      locationType: processed.locationType,
      minimumQualifications: processed.minimumQualifications,
      roleAliases: processed.roleAliases,
      jobNormalization: processed,
      aiProcessingSource: parseResult.aiProcessingSource,
      embedding: null,
      matchStatus: 'pending',
      matchLastRunAt: null,
    };

    const docRef = await adminDb.collection('jobs').add(stripUndefinedDeep(jobData));

    // Non-blocking: matching can take a while with many candidates
    void runJobMatching(adminDb, docRef.id).catch((err) => {
      console.error('[job/create] runJobMatching failed:', docRef.id, err);
    });

    return NextResponse.json({
      success: true,
      jobId: docRef.id,
      message: 'Job created successfully',
    });
  } catch (error) {
    console.error('Error in job creation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
