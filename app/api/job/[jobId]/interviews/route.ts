import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canUserAccessJob } from "@/lib/matching/job-access";
import admin from "firebase-admin";

export const dynamic = "force-dynamic";

const INTERVIEW_STATUSES = ["PROPOSED", "CONFIRMED", "CANCELLED"] as const;

type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

function normalizeStatus(value: unknown): InterviewStatus {
  const raw = String(value || "").toUpperCase().trim();
  if ((INTERVIEW_STATUSES as readonly string[]).includes(raw)) return raw as InterviewStatus;
  return "PROPOSED";
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

function interviewDocId(jobId: string, candidateId: string): string {
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
    let q = adminDb.collection("interviewEvents").where("jobId", "==", jobId);
    if (candidateId) q = q.where("candidateId", "==", candidateId);
    const snap = await q.get();
    const interviews = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => {
        const aDate = a?.scheduledAt?.toDate ? a.scheduledAt.toDate() : a?.scheduledAt || null;
        const bDate = b?.scheduledAt?.toDate ? b.scheduledAt.toDate() : b?.scheduledAt || null;
        return new Date(aDate || 0).getTime() - new Date(bDate || 0).getTime();
      });
    return NextResponse.json({ interviews });
  } catch (error) {
    console.error("GET /api/job/[jobId]/interviews", error);
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
    const scheduledAt = body?.scheduledAt ? new Date(String(body.scheduledAt)) : null;
    const durationMinutes = Math.max(15, Number(body?.durationMinutes || 30));
    const location = String(body?.location || "").trim();
    const notes = String(body?.notes || "").trim();
    const status = normalizeStatus(body?.status);
    if (!candidateId) return NextResponse.json({ error: "Missing candidateId" }, { status: 400 });
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Valid scheduledAt is required" }, { status: 400 });
    }
    const id = interviewDocId(jobId, candidateId);
    const ref = adminDb.collection("interviewEvents").doc(id);
    await ref.set(
      {
        jobId,
        candidateId,
        scheduledAt,
        durationMinutes,
        location,
        notes,
        status,
        createdBy: auth.decoded!.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    const fresh = await ref.get();
    return NextResponse.json({ interview: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("POST /api/job/[jobId]/interviews", error);
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
    const id = interviewDocId(jobId, candidateId);
    const ref = adminDb.collection("interviewEvents").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    const updates: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (body?.scheduledAt !== undefined) {
      updates.scheduledAt = body.scheduledAt ? new Date(String(body.scheduledAt)) : null;
    }
    if (body?.durationMinutes !== undefined) {
      updates.durationMinutes = Math.max(15, Number(body.durationMinutes || 30));
    }
    if (body?.location !== undefined) updates.location = String(body.location || "").trim();
    if (body?.notes !== undefined) updates.notes = String(body.notes || "").trim();
    if (body?.status !== undefined) updates.status = normalizeStatus(body.status);
    await ref.set(updates, { merge: true });
    const fresh = await ref.get();
    return NextResponse.json({ interview: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("PATCH /api/job/[jobId]/interviews", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
