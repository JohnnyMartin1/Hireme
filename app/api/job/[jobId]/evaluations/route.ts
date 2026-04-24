import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canUserAccessJob } from "@/lib/matching/job-access";
import admin from "firebase-admin";

export const dynamic = "force-dynamic";

const ALLOWED_RECOMMENDATIONS = ["STRONG_YES", "YES", "MIXED", "NO", "HOLD"] as const;
const ALLOWED_EVALUATOR_TYPES = ["RECRUITER", "HIRING_MANAGER", "INTERVIEWER"] as const;

type Recommendation = (typeof ALLOWED_RECOMMENDATIONS)[number];
type EvaluatorType = (typeof ALLOWED_EVALUATOR_TYPES)[number];

async function authorizeJobAccess(request: NextRequest, jobId: string) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const decoded = await adminAuth.verifyIdToken(token);
  const jobSnap = await adminDb.collection("jobs").doc(jobId).get();
  if (!jobSnap.exists) {
    return { error: NextResponse.json({ error: "Job not found" }, { status: 404 }) };
  }
  const jobData = jobSnap.data() as Record<string, unknown>;
  const ok = await canUserAccessJob(adminDb, jobData, decoded.uid);
  if (!ok) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { decoded };
}

function normalizeRecommendation(value: unknown): Recommendation {
  const raw = String(value || "").toUpperCase().trim();
  if ((ALLOWED_RECOMMENDATIONS as readonly string[]).includes(raw)) {
    return raw as Recommendation;
  }
  return "HOLD";
}

function normalizeEvaluatorType(value: unknown): EvaluatorType {
  const raw = String(value || "").toUpperCase().trim();
  if ((ALLOWED_EVALUATOR_TYPES as readonly string[]).includes(raw)) {
    return raw as EvaluatorType;
  }
  return "RECRUITER";
}

function normalizeCriterionRatings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      criterionId: String((item as any)?.criterionId || ""),
      rating: Number((item as any)?.rating || 0),
      comment: String((item as any)?.comment || "").trim(),
    }))
    .filter((item) => item.criterionId && Number.isFinite(item.rating) && item.rating > 0)
    .map((item) => ({
      criterionId: item.criterionId,
      rating: Math.min(5, Math.max(1, Math.round(item.rating))),
      comment: item.comment || "",
    }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    if (!jobId) return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;

    const candidateId = request.nextUrl.searchParams.get("candidateId");
    let q = adminDb.collection("candidateEvaluations").where("jobId", "==", jobId);
    if (candidateId) {
      q = q.where("candidateId", "==", candidateId);
    }
    const snap = await q.get();
    const evaluations = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => {
        const aDate = a?.updatedAt?.toDate ? a.updatedAt.toDate() : (a?.updatedAt || a?.createdAt || null);
        const bDate = b?.updatedAt?.toDate ? b.updatedAt.toDate() : (b?.updatedAt || b?.createdAt || null);
        return (new Date(bDate || 0).getTime()) - (new Date(aDate || 0).getTime());
      });

    return NextResponse.json({ evaluations });
  } catch (error) {
    console.error("GET /api/job/[jobId]/evaluations", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    if (!jobId) return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const candidateId = String(body?.candidateId || "");
    const summary = String(body?.summary || "").trim();
    const evaluatorType = normalizeEvaluatorType(body?.evaluatorType);
    const overallRecommendation = normalizeRecommendation(body?.overallRecommendation);
    const criterionRatings = normalizeCriterionRatings(body?.criterionRatings);
    const evaluationId = body?.evaluationId ? String(body.evaluationId) : null;

    if (!candidateId) {
      return NextResponse.json({ error: "Missing candidateId" }, { status: 400 });
    }

    const payload = {
      jobId,
      candidateId,
      authorUserId: auth.decoded!.uid,
      evaluatorType,
      overallRecommendation,
      criterionRatings,
      summary,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    let ref = evaluationId
      ? adminDb.collection("candidateEvaluations").doc(evaluationId)
      : adminDb.collection("candidateEvaluations").doc();

    if (evaluationId) {
      const existing = await ref.get();
      if (!existing.exists) {
        return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
      }
      const existingData = existing.data() as Record<string, unknown>;
      if (String(existingData.authorUserId || "") !== auth.decoded!.uid) {
        return NextResponse.json({ error: "You can only edit your own evaluation" }, { status: 403 });
      }
      if (String(existingData.jobId || "") !== jobId) {
        return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
      }
      await ref.set(payload, { merge: true });
    } else {
      await ref.set({
        ...payload,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const fresh = await ref.get();
    return NextResponse.json({ evaluation: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("POST /api/job/[jobId]/evaluations", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
