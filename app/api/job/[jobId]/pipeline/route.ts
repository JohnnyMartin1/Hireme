import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { canUserAccessJob } from '@/lib/matching/job-access';
import { canonicalPipelineEntryId, dedupePipelineEntriesByCandidate } from '@/lib/pipeline-canonical';
import admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

type PipelineStage =
  | 'NEW'
  | 'SHORTLIST'
  | 'CONTACTED'
  | 'RESPONDED'
  | 'INTERVIEW'
  | 'FINALIST'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED';

const ALLOWED_STAGES: PipelineStage[] = [
  'NEW',
  'SHORTLIST',
  'CONTACTED',
  'RESPONDED',
  'INTERVIEW',
  'FINALIST',
  'OFFER',
  'HIRED',
  'REJECTED',
];

function normalizeStage(value: unknown): PipelineStage {
  const raw = String(value || '').toUpperCase().trim();
  if (raw === 'SHORTLISTED') return 'SHORTLIST';
  if (ALLOWED_STAGES.includes(raw as PipelineStage)) return raw as PipelineStage;
  return 'NEW';
}

function normalizeDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function authorizeJobAccess(request: NextRequest, jobId: string) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const decoded = await adminAuth.verifyIdToken(token);
  const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
  if (!jobSnap.exists) {
    return { error: NextResponse.json({ error: 'Job not found' }, { status: 404 }) };
  }

  const jobData = jobSnap.data() as Record<string, unknown>;
  const ok = await canUserAccessJob(adminDb, jobData, decoded.uid);
  if (!ok) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { decoded, jobData, jobSnap };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    if (!jobId) {
      return NextResponse.json({ error: 'Missing job id' }, { status: 400 });
    }

    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;

    const entriesSnap = await adminDb
      .collection('candidatePipelineEntries')
      .where('jobId', '==', jobId)
      .get();

    const entries = entriesSnap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    const deduped = dedupePipelineEntriesByCandidate(entries as { id: string; jobId: string; candidateId: string }[]);

    return NextResponse.json({ entries: deduped });
  } catch (error) {
    console.error('GET /api/job/[jobId]/pipeline', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    if (!jobId) {
      return NextResponse.json({ error: 'Missing job id' }, { status: 400 });
    }

    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const candidateId = String(body?.candidateId || '');
    const nextFollowUpAt = normalizeDate(body?.nextFollowUpAt);
    const lastContactedAt = normalizeDate(body?.lastContactedAt);

    if (!candidateId) {
      return NextResponse.json({ error: 'Missing candidateId' }, { status: 400 });
    }

    const decoded = auth.decoded!;
    const jobData = auth.jobData!;

    const entryId = canonicalPipelineEntryId(jobId, candidateId);
    const entryRef = adminDb.collection('candidatePipelineEntries').doc(entryId);
    const entrySnap = await entryRef.get();
    const existingData = entrySnap.exists ? (entrySnap.data() as Record<string, unknown>) : null;

    const hasExplicitStage = Object.prototype.hasOwnProperty.call(body, 'stage');
    const previousStage = existingData ? normalizeStage(existingData.stage) : undefined;
    const stage = hasExplicitStage
      ? normalizeStage(body?.stage)
      : previousStage ?? 'NEW';

    const payload: Record<string, unknown> = {
      jobId,
      candidateId,
      companyId: String(existingData?.companyId || jobData.companyId || ''),
      ownerId: String(existingData?.ownerId || decoded.uid),
      stage,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (!entrySnap.exists) {
      payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }
    if (lastContactedAt !== undefined) {
      payload.lastContactedAt = lastContactedAt;
    }
    if (nextFollowUpAt !== undefined) {
      payload.nextFollowUpAt = nextFollowUpAt;
    }

    const transitionedToContacted = stage === 'CONTACTED' && previousStage !== 'CONTACTED';
    if (transitionedToContacted && lastContactedAt === undefined) {
      payload.lastContactedAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await entryRef.set(payload, { merge: true });

    // Remove legacy duplicate rows for the same job + candidate (non-canonical ids).
    const dupSnap = await adminDb
      .collection('candidatePipelineEntries')
      .where('jobId', '==', jobId)
      .where('candidateId', '==', candidateId)
      .get();

    if (dupSnap.size > 1) {
      let batch = adminDb.batch();
      let ops = 0;
      for (const d of dupSnap.docs) {
        if (d.id === entryId) continue;
        batch.delete(d.ref);
        ops++;
        if (ops >= 450) {
          await batch.commit();
          batch = adminDb.batch();
          ops = 0;
        }
      }
      if (ops > 0) {
        await batch.commit();
      }
    }

    const fresh = await entryRef.get();
    return NextResponse.json({
      success: true,
      entry: { id: fresh.id, ...fresh.data() },
    });
  } catch (error) {
    console.error('POST /api/job/[jobId]/pipeline', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
