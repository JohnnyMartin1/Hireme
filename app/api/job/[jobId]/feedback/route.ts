import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  FEEDBACK_STATUSES,
  assertCandidateTiedToJob,
  assertInterviewBelongsToJob,
  authorizeJobRequest,
  feedbackDocId,
  normalizeEnum,
  normalizeOptionalString,
  nowTs,
} from "@/lib/interviews/phase3";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const auth = await authorizeJobRequest(request, params.jobId);
    if (auth.error) return auth.error;
    const candidateId = String(request.nextUrl.searchParams.get("candidateId") || "");
    const interviewEventId = String(request.nextUrl.searchParams.get("interviewEventId") || "");
    const roundId = String(request.nextUrl.searchParams.get("roundId") || "");
    const interviewerUserId = String(request.nextUrl.searchParams.get("interviewerUserId") || "");

    let q = adminDb.collection("interviewFeedback").where("jobId", "==", params.jobId);
    if (candidateId) q = q.where("candidateId", "==", candidateId);
    if (interviewEventId) q = q.where("interviewEventId", "==", interviewEventId);
    if (roundId) q = q.where("roundId", "==", roundId);
    if (interviewerUserId) q = q.where("interviewerUserId", "==", interviewerUserId);
    const snap = await q.get();
    return NextResponse.json({ feedback: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (error) {
    console.error("GET /api/job/[jobId]/feedback", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const auth = await authorizeJobRequest(request, params.jobId);
    if (auth.error) return auth.error;
    const context = auth.context!;
    const body = await request.json().catch(() => ({}));

    const candidateId = String(body?.candidateId || "");
    const interviewEventId = String(body?.interviewEventId || "");
    const interviewerIds = Array.isArray(body?.interviewerIds)
      ? body.interviewerIds.map((id: unknown) => String(id)).filter(Boolean)
      : [];
    if (!candidateId || !interviewEventId || interviewerIds.length === 0) {
      return NextResponse.json({ error: "candidateId, interviewEventId and interviewerIds are required" }, { status: 400 });
    }
    const candidateOk = await assertCandidateTiedToJob(params.jobId, candidateId);
    if (!candidateOk) {
      return NextResponse.json({ error: "Candidate is not associated with this job" }, { status: 403 });
    }
    const interviewCheck = await assertInterviewBelongsToJob(interviewEventId, params.jobId, candidateId);
    if (!interviewCheck.ok) return NextResponse.json({ error: "Interview does not belong to this job/candidate" }, { status: 400 });

    const batch = adminDb.batch();
    for (const interviewerUserId of interviewerIds) {
      const userSnap = await adminDb.collection("users").doc(interviewerUserId).get();
      if (!userSnap.exists) continue;
      const userData = (userSnap.data() || {}) as Record<string, unknown>;
      if (String(userData.companyId || "") !== context.companyId) continue;
      const id = feedbackDocId(interviewEventId, interviewerUserId);
      const ref = adminDb.collection("interviewFeedback").doc(id);
      const existing = await ref.get();
      batch.set(
        ref,
        {
          jobId: params.jobId,
          candidateId,
          companyId: context.companyId,
          interviewEventId,
          planId: normalizeOptionalString(body?.planId),
          roundId: normalizeOptionalString(body?.roundId),
          scorecardTemplateId: normalizeOptionalString(body?.scorecardTemplateId),
          interviewerUserId,
          status: normalizeEnum(body?.status, FEEDBACK_STATUSES, "REQUESTED"),
          ratings: [],
          overallRecommendation: null,
          strengths: null,
          concerns: null,
          summary: null,
          submittedAt: null,
          createdAt: existing.exists ? (existing.data() as any)?.createdAt || nowTs() : nowTs(),
          updatedAt: nowTs(),
        },
        { merge: true }
      );
    }
    await batch.commit();

    const feedbackSnap = await adminDb.collection("interviewFeedback").where("interviewEventId", "==", interviewEventId).get();
    return NextResponse.json({ feedback: feedbackSnap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (error) {
    console.error("POST /api/job/[jobId]/feedback", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
