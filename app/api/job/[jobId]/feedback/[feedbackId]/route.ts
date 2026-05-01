import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FEEDBACK_RECOMMENDATIONS, FEEDBACK_STATUSES, authorizeJobRequest, normalizeEnum, normalizeOptionalString, nowTs } from "@/lib/interviews/phase3";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { jobId: string; feedbackId: string } }) {
  try {
    const auth = await authorizeJobRequest(request, params.jobId);
    if (auth.error) return auth.error;
    const context = auth.context!;
    const body = await request.json().catch(() => ({}));
    const ref = adminDb.collection("interviewFeedback").doc(params.feedbackId);
    const snap = await ref.get();
    if (!snap.exists || String((snap.data() as any)?.jobId || "") !== params.jobId) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }
    const existing = (snap.data() || {}) as Record<string, unknown>;
    const assignedTo = String(existing.interviewerUserId || "");
    const isRecruiter = ["EMPLOYER", "RECRUITER", "ADMIN"].includes(context.role);
    if (!isRecruiter && assignedTo !== context.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const nextStatus = normalizeEnum(body?.status, FEEDBACK_STATUSES, String(existing.status || "REQUESTED") as any);
    const updates: Record<string, unknown> = { updatedAt: nowTs(), status: nextStatus };
    const incomingRatings = Array.isArray(body?.ratings)
      ? body.ratings.map((r: any) => ({
        criterionId: String(r?.criterionId || ""),
        rating: String(r?.rating || ""),
        comment: normalizeOptionalString(r?.comment),
      }))
      : undefined;
    if (incomingRatings) updates.ratings = incomingRatings;
    if (body?.overallRecommendation !== undefined) {
      updates.overallRecommendation =
        body.overallRecommendation === null
          ? null
          : normalizeEnum(body.overallRecommendation, FEEDBACK_RECOMMENDATIONS, "MIXED");
    }
    if (body?.strengths !== undefined) updates.strengths = normalizeOptionalString(body.strengths);
    if (body?.concerns !== undefined) updates.concerns = normalizeOptionalString(body.concerns);
    if (body?.summary !== undefined) updates.summary = normalizeOptionalString(body.summary);
    if (nextStatus === "SUBMITTED") {
      const scorecardTemplateId = String(existing.scorecardTemplateId || "").trim();
      if (!scorecardTemplateId) {
        return NextResponse.json({ error: "Cannot submit feedback: no scorecard template is attached." }, { status: 400 });
      }
      const templateSnap = await adminDb.collection("scorecardTemplates").doc(scorecardTemplateId).get();
      if (!templateSnap.exists || String((templateSnap.data() as any)?.jobId || "") !== params.jobId) {
        return NextResponse.json({ error: "Cannot submit feedback: scorecard template was not found for this job." }, { status: 400 });
      }
      const template = (templateSnap.data() || {}) as Record<string, unknown>;
      const criteria = Array.isArray(template.criteria) ? (template.criteria as Array<Record<string, unknown>>) : [];
      const requiredCriteria = criteria.filter((c) => c?.required !== false);
      const ratingsToValidate = (incomingRatings ?? (Array.isArray(existing.ratings) ? existing.ratings : [])) as Array<{
        criterionId?: string;
        rating?: string;
        comment?: string | null;
      }>;
      const missingRequired = requiredCriteria.filter((criterion) => {
        const criterionId = String(criterion.id || "");
        if (!criterionId) return false;
        const entry = ratingsToValidate.find((r) => String(r.criterionId || "") === criterionId);
        const ratingValue = String(entry?.rating || "").trim();
        const commentValue = String(entry?.comment || "").trim();
        const scale = String(criterion.ratingScale || "").toUpperCase();
        if (scale === "TEXT") return !ratingValue && !commentValue;
        return !ratingValue;
      });
      if (missingRequired.length > 0) {
        const labels = missingRequired
          .map((criterion) => String(criterion.label || criterion.id || "required criterion"))
          .filter(Boolean)
          .join(", ");
        return NextResponse.json(
          { error: `Cannot submit feedback: complete all required scorecard criteria first (${labels}).` },
          { status: 400 }
        );
      }
    }
    if (nextStatus === "SUBMITTED") updates.submittedAt = nowTs();
    await ref.set(updates, { merge: true });
    const fresh = await ref.get();
    return NextResponse.json({ feedback: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("PATCH /api/job/[jobId]/feedback/[feedbackId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
