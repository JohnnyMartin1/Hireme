import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canUserAccessJob } from "@/lib/matching/job-access";
import admin from "firebase-admin";

export const dynamic = "force-dynamic";

const REVIEW_STATUSES = [
  "REQUESTED",
  "SUBMITTED",
  "APPROVED",
  "DECLINED",
  "NEEDS_DISCUSSION",
] as const;
type ReviewStatus = (typeof REVIEW_STATUSES)[number];

function normalizeStatus(value: unknown): ReviewStatus {
  const raw = String(value || "").toUpperCase().trim();
  if ((REVIEW_STATUSES as readonly string[]).includes(raw)) return raw as ReviewStatus;
  return "REQUESTED";
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

function reviewDocId(jobId: string, candidateId: string): string {
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
    let q = adminDb.collection("candidateReviewRequests").where("jobId", "==", jobId);
    if (candidateId) q = q.where("candidateId", "==", candidateId);
    const snap = await q.get();
    const reviews = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => {
        const aDate = a?.updatedAt?.toDate ? a.updatedAt.toDate() : (a?.updatedAt || a?.requestedAt || null);
        const bDate = b?.updatedAt?.toDate ? b.updatedAt.toDate() : (b?.updatedAt || b?.requestedAt || null);
        return (new Date(bDate || 0).getTime()) - (new Date(aDate || 0).getTime());
      });
    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("GET /api/job/[jobId]/reviews", error);
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
    const status = normalizeStatus(body?.status);
    const requestedReviewerUserId = body?.requestedReviewerUserId
      ? String(body.requestedReviewerUserId)
      : null;
    const linkedEvaluationId = body?.linkedEvaluationId ? String(body.linkedEvaluationId) : null;
    const reviewSummary = body?.reviewSummary ? String(body.reviewSummary).trim() : null;
    if (!candidateId) {
      return NextResponse.json({ error: "Missing candidateId" }, { status: 400 });
    }

    const id = reviewDocId(jobId, candidateId);
    const ref = adminDb.collection("candidateReviewRequests").doc(id);
    const snap = await ref.get();
    const existing = snap.exists ? (snap.data() as Record<string, unknown>) : null;

    const payload: Record<string, unknown> = {
      jobId,
      candidateId,
      requestedByUserId: String(existing?.requestedByUserId || auth.decoded!.uid),
      requestedReviewerUserId,
      status,
      linkedEvaluationId,
      reviewSummary,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (!snap.exists || status === "REQUESTED") {
      payload.requestedAt = admin.firestore.FieldValue.serverTimestamp();
    }
    if (status !== "REQUESTED") {
      payload.reviewedAt = admin.firestore.FieldValue.serverTimestamp();
    }
    await ref.set(payload, { merge: true });
    const fresh = await ref.get();
    return NextResponse.json({ review: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("POST /api/job/[jobId]/reviews", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
