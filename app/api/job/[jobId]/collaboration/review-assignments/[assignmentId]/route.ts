import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canUserAccessJob } from "@/lib/matching/job-access";

export const dynamic = "force-dynamic";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { jobId: string; assignmentId: string } }
) {
  try {
    const { jobId, assignmentId } = params;
    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const ref = adminDb.collection("candidateReviewAssignments").doc(assignmentId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    const existing = snap.data() as Record<string, unknown>;
    if (String(existing.jobId || "") !== jobId) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    const isAssignee = String(existing.assignedToUserId || "") === auth.decoded!.uid;
    const isRequester = String(existing.requestedByUserId || "") === auth.decoded!.uid;
    const isOwner = String((auth.job as any).employerId || "") === auth.decoded!.uid;
    if (!isAssignee && !isRequester && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (body?.status !== undefined) updates.status = String(body.status).toUpperCase();
    if (body?.priority !== undefined && (isRequester || isOwner)) updates.priority = String(body.priority).toUpperCase();
    if (body?.message !== undefined && (isRequester || isOwner)) updates.message = String(body.message || "").trim();
    if (body?.decision !== undefined) updates.decision = body.decision ? String(body.decision) : null;
    if (body?.feedbackSummary !== undefined) updates.feedbackSummary = String(body.feedbackSummary || "").trim();
    if (String(updates.status || "").toUpperCase() === "COMPLETED") {
      updates.completedAt = admin.firestore.FieldValue.serverTimestamp();
    }
    await ref.set(updates, { merge: true });
    const fresh = await ref.get();
    return NextResponse.json({ assignment: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("PATCH review assignment", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string; assignmentId: string } }
) {
  try {
    const { jobId, assignmentId } = params;
    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;
    const ref = adminDb.collection("candidateReviewAssignments").doc(assignmentId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    const existing = snap.data() as Record<string, unknown>;
    const isRequester = String(existing.requestedByUserId || "") === auth.decoded!.uid;
    const isOwner = String((auth.job as any).employerId || "") === auth.decoded!.uid;
    if (!isRequester && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await ref.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE review assignment", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
