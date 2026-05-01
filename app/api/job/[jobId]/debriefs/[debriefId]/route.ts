import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { canonicalPipelineEntryId } from "@/lib/pipeline-canonical";
import { DEBRIEF_DECISIONS, DEBRIEF_STATUSES, authorizeJobRequest, normalizeEnum, normalizeOptionalString, nowTs } from "@/lib/interviews/phase3";

export const dynamic = "force-dynamic";

function stageForDecision(decision: string): string | null {
  if (decision === "REJECT") return "REJECTED";
  if (decision === "FINALIST") return "FINALIST";
  if (decision === "ADVANCE") return "INTERVIEW";
  return null;
}

export async function PATCH(request: NextRequest, { params }: { params: { jobId: string; debriefId: string } }) {
  try {
    const auth = await authorizeJobRequest(request, params.jobId);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const ref = adminDb.collection("candidateDebriefs").doc(params.debriefId);
    const snap = await ref.get();
    if (!snap.exists || String((snap.data() as any)?.jobId || "") !== params.jobId) {
      return NextResponse.json({ error: "Debrief not found" }, { status: 404 });
    }
    const existing = (snap.data() || {}) as Record<string, unknown>;
    const status = normalizeEnum(body?.status, DEBRIEF_STATUSES, String(existing.status || "NOT_STARTED") as any);
    const decision =
      body?.decision === undefined
        ? existing.decision
        : body.decision === null
          ? null
          : normalizeEnum(body.decision, DEBRIEF_DECISIONS, "HOLD");
    const candidateId = String(existing.candidateId || "");
    const overrideMissingFeedback = Boolean(body?.overrideMissingFeedback);
    const missingFeedbackOverrideReason = normalizeOptionalString(body?.missingFeedbackOverrideReason);
    if (status === "COMPLETED" && candidateId) {
      const feedbackSnap = await adminDb
        .collection("interviewFeedback")
        .where("jobId", "==", params.jobId)
        .where("candidateId", "==", candidateId)
        .get();
      const missingFeedbackCount = feedbackSnap.docs.filter((doc) => {
        const row = doc.data() as Record<string, unknown>;
        const st = String(row.status || "").toUpperCase();
        return st !== "SUBMITTED" && st !== "WAIVED";
      }).length;
      if (missingFeedbackCount > 0 && !overrideMissingFeedback) {
        return NextResponse.json(
          { error: `Missing feedback from ${missingFeedbackCount} interviewer(s). Add an override to complete debrief.` },
          { status: 400 }
        );
      }
      if (missingFeedbackCount > 0 && overrideMissingFeedback && !missingFeedbackOverrideReason) {
        return NextResponse.json({ error: "Override reason is required when feedback is missing." }, { status: 400 });
      }
    }

    await ref.set(
      {
        status,
        decision,
        decisionReason: body?.decisionReason === undefined ? existing.decisionReason || null : normalizeOptionalString(body.decisionReason),
        feedbackSummary: body?.feedbackSummary === undefined ? existing.feedbackSummary || null : normalizeOptionalString(body.feedbackSummary),
        overrideMissingFeedback,
        missingFeedbackOverrideReason,
        completedAt: status === "COMPLETED" ? nowTs() : null,
        updatedAt: nowTs(),
      },
      { merge: true }
    );

    const shouldUpdatePipeline = Boolean(body?.updatePipelineStage);
    if (shouldUpdatePipeline && candidateId && typeof decision === "string") {
      const targetStage = stageForDecision(decision);
      if (targetStage) {
        const pipelineId = canonicalPipelineEntryId(params.jobId, candidateId);
        await adminDb.collection("candidatePipelineEntries").doc(pipelineId).set(
          {
            id: pipelineId,
            jobId: params.jobId,
            candidateId,
            stage: targetStage,
            updatedAt: nowTs(),
          },
          { merge: true }
        );
      }
    }

    const fresh = await ref.get();
    return NextResponse.json({ debrief: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("PATCH /api/job/[jobId]/debriefs/[debriefId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
