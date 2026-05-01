import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  INTERVIEW_PLAN_STATUSES,
  authorizeJobRequest,
  normalizeEnum,
  normalizeOptionalString,
  nowTs,
  planDocId,
} from "@/lib/interviews/phase3";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const jobId = params.jobId;
    const auth = await authorizeJobRequest(request, jobId);
    if (auth.error) return auth.error;

    const planSnap = await adminDb.collection("interviewPlans").doc(planDocId(jobId)).get();
    const plan = planSnap.exists ? ({ id: planSnap.id, ...planSnap.data() } as Record<string, unknown>) : null;

    const roundsSnap = await adminDb
      .collection("interviewPlanRounds")
      .where("jobId", "==", jobId)
      .where("active", "==", true)
      .get();
    const rounds = roundsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => Number(a.order || 0) - Number(b.order || 0));

    const scorecardsSnap = await adminDb.collection("scorecardTemplates").where("jobId", "==", jobId).get();
    const scorecardTemplates = scorecardsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ plan, rounds, scorecardTemplates });
  } catch (error) {
    console.error("GET /api/job/[jobId]/interview-plan", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const jobId = params.jobId;
    const auth = await authorizeJobRequest(request, jobId);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const context = auth.context!;

    const title = String(body?.title || "Interview Plan").trim();
    const status = normalizeEnum(body?.status, INTERVIEW_PLAN_STATUSES, "ACTIVE");
    const description = normalizeOptionalString(body?.description);
    const ref = adminDb.collection("interviewPlans").doc(planDocId(jobId));
    const existing = await ref.get();
    await ref.set(
      {
        jobId,
        companyId: context.companyId,
        createdByUserId: existing.exists ? (existing.data() as any)?.createdByUserId || context.userId : context.userId,
        title,
        description,
        status,
        createdAt: existing.exists ? (existing.data() as any)?.createdAt || nowTs() : nowTs(),
        updatedAt: nowTs(),
      },
      { merge: true }
    );
    const fresh = await ref.get();
    return NextResponse.json({ plan: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("POST /api/job/[jobId]/interview-plan", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
