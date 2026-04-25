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

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const jobId = params.jobId;
    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;
    const candidateId = request.nextUrl.searchParams.get("candidateId");
    if (!candidateId) return NextResponse.json({ error: "Missing candidateId" }, { status: 400 });
    const snap = await adminDb
      .collection("candidateInternalComments")
      .where("jobId", "==", jobId)
      .where("candidateId", "==", candidateId)
      .where("deletedAt", "==", null)
      .get();
    const comments = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => {
        const ad = a?.createdAt?.toDate ? a.createdAt.toDate() : a?.createdAt || 0;
        const bd = b?.createdAt?.toDate ? b.createdAt.toDate() : b?.createdAt || 0;
        return new Date(ad).getTime() - new Date(bd).getTime();
      });
    return NextResponse.json({ comments });
  } catch (error) {
    console.error("GET collaboration comments", error);
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
    const commentBody = String(body?.body || "").trim();
    const mentions = Array.isArray(body?.mentions) ? body.mentions.map((x: unknown) => String(x)) : [];
    if (!candidateId || !commentBody) {
      return NextResponse.json({ error: "candidateId and body are required" }, { status: 400 });
    }
    const candidateSnap = await adminDb.collection("users").doc(candidateId).get();
    if (!candidateSnap.exists) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    const docRef = await adminDb.collection("candidateInternalComments").add({
      companyId: String((auth.job as any).companyId || ""),
      jobId,
      candidateId,
      authorUserId: auth.decoded!.uid,
      body: commentBody,
      mentions,
      parentCommentId: body?.parentCommentId ? String(body.parentCommentId) : null,
      deletedAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const fresh = await docRef.get();
    return NextResponse.json({ comment: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("POST collaboration comments", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
