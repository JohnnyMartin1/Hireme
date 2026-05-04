import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canUserAccessJob } from "@/lib/matching/job-access";
import { assertCandidateTiedToJob } from "@/lib/interviews/phase3";
import admin from "firebase-admin";

export const dynamic = "force-dynamic";

const SEQUENCE_STATUSES = ["ACTIVE", "COMPLETED", "STOPPED"] as const;

type SequenceStatus = (typeof SEQUENCE_STATUSES)[number];

function normalizeStatus(value: unknown): SequenceStatus {
  const raw = String(value || "").toUpperCase().trim();
  if ((SEQUENCE_STATUSES as readonly string[]).includes(raw)) return raw as SequenceStatus;
  return "ACTIVE";
}

function normalizeSteps(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      delayDays: Math.max(0, Number((item as any)?.delayDays || 0)),
      messageTemplateId: (item as any)?.messageTemplateId ? String((item as any).messageTemplateId) : null,
      body: (item as any)?.body ? String((item as any).body).trim() : null,
    }))
    .filter((item) => item.messageTemplateId || item.body);
}

async function authorizeJobAccess(request: NextRequest, jobId: string) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const decoded = await adminAuth.verifyIdToken(token);
  const jobSnap = await adminDb.collection("jobs").doc(jobId).get();
  if (!jobSnap.exists) {
    return { error: NextResponse.json({ error: "Job not found" }, { status: 404 }) };
  }
  const jobData = jobSnap.data() as Record<string, unknown>;
  const ok = await canUserAccessJob(adminDb, jobData, decoded.uid);
  if (!ok) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { decoded };
}

function sequenceDocId(jobId: string, candidateId: string): string {
  return `job_${jobId}__candidate_${candidateId}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    if (!jobId) return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;

    const candidateId = request.nextUrl.searchParams.get("candidateId");
    let q = adminDb.collection("outreachSequences").where("jobId", "==", jobId);
    if (candidateId) q = q.where("candidateId", "==", candidateId);
    const snap = await q.get();
    const sequences = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => {
        const aDate = a?.updatedAt?.toDate ? a.updatedAt.toDate() : a?.updatedAt || a?.createdAt || null;
        const bDate = b?.updatedAt?.toDate ? b.updatedAt.toDate() : b?.updatedAt || b?.createdAt || null;
        return new Date(bDate || 0).getTime() - new Date(aDate || 0).getTime();
      });
    return NextResponse.json({ sequences });
  } catch (error) {
    console.error("GET /api/job/[jobId]/sequences", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    if (!jobId) return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const candidateId = String(body?.candidateId || "");
    const steps = normalizeSteps(body?.steps);
    if (!candidateId) return NextResponse.json({ error: "Missing candidateId" }, { status: 400 });
    if (!(await assertCandidateTiedToJob(jobId, candidateId))) {
      return NextResponse.json({ error: "Candidate is not tied to this job" }, { status: 403 });
    }
    if (steps.length === 0) {
      return NextResponse.json({ error: "At least one sequence step is required" }, { status: 400 });
    }
    const id = sequenceDocId(jobId, candidateId);
    const ref = adminDb.collection("outreachSequences").doc(id);
    const now = admin.firestore.FieldValue.serverTimestamp();
    await ref.set(
      {
        jobId,
        candidateId,
        status: "ACTIVE",
        steps,
        currentStepIndex: 0,
        nextStepAt: now,
        createdByUserId: auth.decoded!.uid,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
    const fresh = await ref.get();
    return NextResponse.json({ sequence: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("POST /api/job/[jobId]/sequences", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    if (!jobId) return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const candidateId = String(body?.candidateId || "");
    if (!candidateId) return NextResponse.json({ error: "Missing candidateId" }, { status: 400 });
    if (!(await assertCandidateTiedToJob(jobId, candidateId))) {
      return NextResponse.json({ error: "Candidate is not tied to this job" }, { status: 403 });
    }
    const id = sequenceDocId(jobId, candidateId);
    const ref = adminDb.collection("outreachSequences").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Sequence not found" }, { status: 404 });

    const updates: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (body?.status !== undefined) updates.status = normalizeStatus(body.status);
    if (body?.steps !== undefined) updates.steps = normalizeSteps(body.steps);
    if (body?.currentStepIndex !== undefined) {
      updates.currentStepIndex = Math.max(0, Number(body.currentStepIndex || 0));
    }
    if (body?.nextStepAt !== undefined) {
      updates.nextStepAt = body.nextStepAt ? new Date(String(body.nextStepAt)) : null;
    }
    if (body?.stoppedReason !== undefined) {
      updates.stoppedReason = body.stoppedReason ? String(body.stoppedReason) : null;
    }
    if (body?.status && String(body.status).toUpperCase() !== "ACTIVE") {
      updates.lastTriggeredAt = admin.firestore.FieldValue.serverTimestamp();
    }
    await ref.set(updates, { merge: true });
    const fresh = await ref.get();
    return NextResponse.json({ sequence: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("PATCH /api/job/[jobId]/sequences", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
