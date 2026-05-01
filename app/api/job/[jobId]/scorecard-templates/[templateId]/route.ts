import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FEEDBACK_RECOMMENDATIONS, SCORECARD_RATING_SCALES, authorizeJobRequest, normalizeEnum, normalizeOptionalString, nowTs } from "@/lib/interviews/phase3";

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

export async function PATCH(request: NextRequest, { params }: { params: { jobId: string; templateId: string } }) {
  try {
    const auth = await authorizeJobRequest(request, params.jobId);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const ref = adminDb.collection("scorecardTemplates").doc(params.templateId);
    const snap = await ref.get();
    if (!snap.exists || String((snap.data() as any)?.jobId || "") !== params.jobId) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    const updates: Record<string, unknown> = { updatedAt: nowTs() };
    if (body?.title !== undefined) updates.title = String(body.title || "").trim();
    if (body?.description !== undefined) updates.description = normalizeOptionalString(body.description);
    if (body?.criteria !== undefined) updates.criteria = normalizeCriteria(body.criteria);
    if (body?.recommendationOptions !== undefined && Array.isArray(body.recommendationOptions)) {
      updates.recommendationOptions = body.recommendationOptions.map((v: unknown) =>
        normalizeEnum(v, FEEDBACK_RECOMMENDATIONS, "MIXED")
      );
    }
    await ref.set(updates, { merge: true });
    const fresh = await ref.get();
    return NextResponse.json({ template: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("PATCH /api/job/[jobId]/scorecard-templates/[templateId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
