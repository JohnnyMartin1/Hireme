import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canUserAccessJob } from "@/lib/matching/job-access";

export const dynamic = "force-dynamic";

const STATUSES = ["REQUESTED", "VIEWED", "COMPLETED", "DECLINED"] as const;
const PRIORITIES = ["LOW", "NORMAL", "HIGH"] as const;

function normalizeStatus(v: unknown) {
  const raw = String(v || "").toUpperCase().trim();
  return (STATUSES as readonly string[]).includes(raw) ? raw : "REQUESTED";
}
function normalizePriority(v: unknown) {
  const raw = String(v || "").toUpperCase().trim();
  return (PRIORITIES as readonly string[]).includes(raw) ? raw : "NORMAL";
}

async function authorizeJobAccess(request: NextRequest, jobId: string) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const decoded = await adminAuth.verifyIdToken(token);
  const jobSnap = await adminDb.collection("jobs").doc(jobId).get();
  if (!jobSnap.exists) return { error: NextResponse.json({ error: "Job not found" }, { status: 404 }) };
  const job = jobSnap.data() as Record<string, unknown>;
  const ok = await canUserAccessJob(adminDb, job, decoded.uid);
  if (!ok) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { decoded, job };
}

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const jobId = params.jobId;
    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;
    const candidateId = request.nextUrl.searchParams.get("candidateId");
    let q = adminDb.collection("candidateReviewAssignments").where("jobId", "==", jobId);
    if (candidateId) q = q.where("candidateId", "==", candidateId);
    const snap = await q.get();
    const assignments = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => {
        const ad = a?.updatedAt?.toDate ? a.updatedAt.toDate() : a?.updatedAt || a?.createdAt || null;
        const bd = b?.updatedAt?.toDate ? b.updatedAt.toDate() : b?.updatedAt || b?.createdAt || null;
        return new Date(bd || 0).getTime() - new Date(ad || 0).getTime();
      });
    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("GET review-assignments", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const jobId = params.jobId;
    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const candidateId = String(body?.candidateId || "");
    const assignedToUserId = String(body?.assignedToUserId || "");
    if (!candidateId || !assignedToUserId) {
      return NextResponse.json({ error: "candidateId and assignedToUserId are required" }, { status: 400 });
    }

    const candidateSnap = await adminDb.collection("users").doc(candidateId).get();
    if (!candidateSnap.exists) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    const assignedSnap = await adminDb.collection("users").doc(assignedToUserId).get();
    const assigned = assignedSnap.data() as Record<string, unknown> | undefined;
    if (!assignedSnap.exists || !assigned) return NextResponse.json({ error: "Reviewer not found" }, { status: 404 });
    if (String(assigned.companyId || "") !== String((auth.job as any).companyId || "")) {
      return NextResponse.json({ error: "Reviewer must belong to this company" }, { status: 400 });
    }

    const id = `reviewAssignment_${jobId}_${candidateId}_${assignedToUserId}`;
    const ref = adminDb.collection("candidateReviewAssignments").doc(id);
    const existing = await ref.get();
    const now = admin.firestore.FieldValue.serverTimestamp();
    await ref.set(
      {
        companyId: String((auth.job as any).companyId || ""),
        jobId,
        candidateId,
        requestedByUserId: auth.decoded!.uid,
        assignedToUserId,
        status: normalizeStatus(body?.status),
        priority: normalizePriority(body?.priority),
        message: body?.message ? String(body.message).trim() : null,
        decision: body?.decision ? String(body.decision) : null,
        feedbackSummary: body?.feedbackSummary ? String(body.feedbackSummary).trim() : null,
        createdAt: existing.exists ? (existing.data() as any)?.createdAt || now : now,
        updatedAt: now,
        completedAt: normalizeStatus(body?.status) === "COMPLETED" ? now : null,
      },
      { merge: true }
    );
    const fresh = await ref.get();
    return NextResponse.json({ assignment: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("POST review-assignments", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
