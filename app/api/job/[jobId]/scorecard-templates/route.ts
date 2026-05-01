import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  FEEDBACK_RECOMMENDATIONS,
  SCORECARD_RATING_SCALES,
  authorizeJobRequest,
  normalizeEnum,
  normalizeOptionalString,
  nowTs,
  planDocId,
} from "@/lib/interviews/phase3";

export const dynamic = "force-dynamic";

function normalizeCriteria(criteria: unknown) {
  if (!Array.isArray(criteria)) return [];
  return criteria.map((c, i) => {
    const item = (c || {}) as Record<string, unknown>;
    return {
      id: String(item.id || `criterion_${i + 1}`),
      label: String(item.label || "").trim(),
      description: normalizeOptionalString(item.description),
      ratingScale: normalizeEnum(item.ratingScale, SCORECARD_RATING_SCALES, "ONE_TO_FIVE"),
      required: item.required === undefined ? true : Boolean(item.required),
      order: Number(item.order ?? i),
    };
  });
}

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const auth = await authorizeJobRequest(request, params.jobId);
    if (auth.error) return auth.error;
    const roundId = String(request.nextUrl.searchParams.get("roundId") || "");
    let q = adminDb.collection("scorecardTemplates").where("jobId", "==", params.jobId);
    if (roundId) q = q.where("roundId", "==", roundId);
    const snap = await q.get();
    return NextResponse.json({ templates: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (error) {
    console.error("GET /api/job/[jobId]/scorecard-templates", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const auth = await authorizeJobRequest(request, params.jobId);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const context = auth.context!;

    const roundId = String(body?.roundId || "");
    if (!roundId) return NextResponse.json({ error: "roundId is required" }, { status: 400 });
    const planId = String(body?.planId || planDocId(params.jobId));
    const templateId = String(body?.id || adminDb.collection("scorecardTemplates").doc().id);
    const ref = adminDb.collection("scorecardTemplates").doc(templateId);
    const existing = await ref.get();
    await ref.set(
      {
        jobId: params.jobId,
        companyId: context.companyId,
        roundId,
        planId,
        title: String(body?.title || "Interview Scorecard").trim(),
        description: normalizeOptionalString(body?.description),
        criteria: normalizeCriteria(body?.criteria),
        recommendationOptions: Array.isArray(body?.recommendationOptions)
          ? body.recommendationOptions.map((v: unknown) => normalizeEnum(v, FEEDBACK_RECOMMENDATIONS, "MIXED"))
          : [...FEEDBACK_RECOMMENDATIONS],
        createdAt: existing.exists ? (existing.data() as any)?.createdAt || nowTs() : nowTs(),
        updatedAt: nowTs(),
      },
      { merge: true }
    );
    const fresh = await ref.get();
    return NextResponse.json({ template: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("POST /api/job/[jobId]/scorecard-templates", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
