import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { canonicalPipelineEntryId } from "@/lib/pipeline-canonical";
import {
  DEBRIEF_DECISIONS,
  DEBRIEF_STATUSES,
  assertCandidateInCompany,
  authorizeJobRequest,
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
    let q = adminDb.collection("candidateDebriefs").where("jobId", "==", params.jobId);
    if (candidateId) q = q.where("candidateId", "==", candidateId);
    const snap = await q.get();
    return NextResponse.json({ debriefs: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (error) {
    console.error("GET /api/job/[jobId]/debriefs", error);
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
    if (!candidateId) return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
    const candidateOk = await assertCandidateInCompany(candidateId, context.companyId);
    if (!candidateOk) return NextResponse.json({ error: "Candidate is not valid for this company" }, { status: 400 });

    const debriefId = String(body?.id || `job_${params.jobId}__candidate_${candidateId}`);
    const ref = adminDb.collection("candidateDebriefs").doc(debriefId);
    const existing = await ref.get();
    const status = normalizeEnum(body?.status, DEBRIEF_STATUSES, "NOT_STARTED");
    const decision = body?.decision ? normalizeEnum(body.decision, DEBRIEF_DECISIONS, "HOLD") : null;
    await ref.set(
      {
        jobId: params.jobId,
        candidateId,
        companyId: context.companyId,
        createdByUserId: existing.exists ? (existing.data() as any)?.createdByUserId || context.userId : context.userId,
        status,
        feedbackSummary: normalizeOptionalString(body?.feedbackSummary),
        decision,
        decisionReason: normalizeOptionalString(body?.decisionReason),
        completedAt: status === "COMPLETED" ? nowTs() : null,
        createdAt: existing.exists ? (existing.data() as any)?.createdAt || nowTs() : nowTs(),
        updatedAt: nowTs(),
      },
      { merge: true }
    );
    const fresh = await ref.get();
    return NextResponse.json({ debrief: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("POST /api/job/[jobId]/debriefs", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
