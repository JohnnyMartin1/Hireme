import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  INTERVIEW_ROUND_TYPES,
  authorizeJobRequest,
  normalizeEnum,
  normalizeOptionalString,
  nowTs,
  planDocId,
} from "@/lib/interviews/phase3";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const jobId = params.jobId;
    const auth = await authorizeJobRequest(request, jobId);
    if (auth.error) return auth.error;
    const context = auth.context!;
    const body = await request.json().catch(() => ({}));

    const rounds = Array.isArray(body?.rounds) ? body.rounds : [];
    if (!rounds.length) return NextResponse.json({ error: "rounds array is required" }, { status: 400 });

    const planId = String(body?.planId || planDocId(jobId));
    const batch = adminDb.batch();
    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i] as Record<string, unknown>;
      const roundId = String(round?.id || adminDb.collection("interviewPlanRounds").doc().id);
      const ref = adminDb.collection("interviewPlanRounds").doc(roundId);
      batch.set(
        ref,
        {
          planId,
          jobId,
          companyId: context.companyId,
          roundName: String(round?.roundName || `Round ${i + 1}`).trim(),
          roundType: normalizeEnum(round?.roundType, INTERVIEW_ROUND_TYPES, "CUSTOM"),
          description: normalizeOptionalString(round?.description),
          defaultDurationMinutes: Math.max(15, Number(round?.defaultDurationMinutes || 30)),
          order: Number(round?.order ?? i),
          required: Boolean(round?.required ?? true),
          defaultInterviewerIds: Array.isArray(round?.defaultInterviewerIds)
            ? round.defaultInterviewerIds.map((id: unknown) => String(id)).filter(Boolean)
            : [],
          active: round?.active === undefined ? true : Boolean(round.active),
          createdAt: round?.id ? (round as any).createdAt || nowTs() : nowTs(),
          updatedAt: nowTs(),
        },
        { merge: true }
      );
    }
    await batch.commit();

    const freshSnap = await adminDb
      .collection("interviewPlanRounds")
      .where("jobId", "==", jobId)
      .where("active", "==", true)
      .get();
    const freshRounds = freshSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => Number(a.order || 0) - Number(b.order || 0));
    return NextResponse.json({ rounds: freshRounds });
  } catch (error) {
    console.error("POST /api/job/[jobId]/interview-plan/rounds", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
