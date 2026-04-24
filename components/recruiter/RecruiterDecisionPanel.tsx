"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/NotificationSystem";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import {
  fetchJobEvaluationCriteria,
  fetchJobEvaluations,
  fetchJobReviews,
  saveCandidateEvaluation,
  upsertCandidateReview,
} from "@/lib/decision-client";
import type {
  CandidateEvaluation,
  CandidateReviewRequest,
  JobEvaluationCriterion,
  OverallRecommendation,
  ReviewStatus,
} from "@/lib/hiring-decision";
import {
  OVERALL_RECOMMENDATIONS,
  recommendationLabel,
  reviewStatusLabel,
  summarizeCandidateEvaluations,
} from "@/lib/hiring-decision";
import { formatRecruiterAttentionLine } from "@/lib/communication-status";

const REVIEW_STATUS_ACTIONS: ReviewStatus[] = [
  "REQUESTED",
  "SUBMITTED",
  "APPROVED",
  "NEEDS_DISCUSSION",
  "DECLINED",
];

export default function RecruiterDecisionPanel({
  jobId,
  candidateId,
  pipelineStage,
}: {
  jobId: string;
  candidateId: string;
  pipelineStage?: string;
}) {
  const toast = useToast();
  const { user } = useFirebaseAuth();
  const [loading, setLoading] = useState(true);
  const [savingEval, setSavingEval] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [criteria, setCriteria] = useState<JobEvaluationCriterion[]>([]);
  const [evaluations, setEvaluations] = useState<CandidateEvaluation[]>([]);
  const [review, setReview] = useState<CandidateReviewRequest | null>(null);
  const [recommendation, setRecommendation] = useState<OverallRecommendation>("HOLD");
  const [summary, setSummary] = useState("");
  const [reviewSummary, setReviewSummary] = useState("");
  const [ratingsByCriterion, setRatingsByCriterion] = useState<Record<string, string>>({});
  const [commentsByCriterion, setCommentsByCriterion] = useState<Record<string, string>>({});

  const activeCriteria = useMemo(
    () => [...criteria].filter((c) => c.active !== false).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    [criteria]
  );

  const evaluationSummary = useMemo(
    () => summarizeCandidateEvaluations(evaluations, activeCriteria),
    [evaluations, activeCriteria]
  );

  const attentionLine = useMemo(
    () =>
      formatRecruiterAttentionLine({
        pipelineStage,
        hasEvaluation: evaluationSummary.count > 0,
        isEvaluationComplete: evaluationSummary.isComplete,
        reviewStatus: review?.status,
      }),
    [pipelineStage, evaluationSummary, review?.status]
  );

  const load = async () => {
    if (!user || !candidateId) return;
    if (!jobId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const [criteriaRes, evalRes, reviewRes] = await Promise.all([
        fetchJobEvaluationCriteria(jobId, token),
        fetchJobEvaluations(jobId, token, candidateId),
        fetchJobReviews(jobId, token, candidateId),
      ]);
      if (!criteriaRes.ok) {
        toast.error("Evaluation", criteriaRes.error || "Failed to load criteria");
      } else {
        setCriteria(criteriaRes.data.criteria || []);
      }
      if (!evalRes.ok) {
        toast.error("Evaluation", evalRes.error || "Failed to load evaluations");
      } else {
        setEvaluations((evalRes.data.evaluations || []) as CandidateEvaluation[]);
      }
      if (!reviewRes.ok) {
        toast.error("Review", reviewRes.error || "Failed to load review status");
      } else {
        const first = (reviewRes.data.reviews || [])[0] as CandidateReviewRequest | undefined;
        setReview(first || null);
        setReviewSummary(String(first?.reviewSummary || ""));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, jobId, candidateId]);

  const handleSaveEvaluation = async () => {
    if (!user) return;
    setSavingEval(true);
    try {
      const token = await user.getIdToken();
      const criterionRatings = activeCriteria
        .map((criterion) => ({
          criterionId: criterion.id,
          rating: Number(ratingsByCriterion[criterion.id] || 0),
          comment: commentsByCriterion[criterion.id] || "",
        }))
        .filter((row) => row.rating > 0);

      const res = await saveCandidateEvaluation(
        jobId,
        {
          candidateId,
          evaluatorType: "RECRUITER",
          overallRecommendation: recommendation,
          criterionRatings,
          summary: summary.trim(),
        },
        token
      );
      if (!res.ok) {
        toast.error("Evaluation", res.error || "Failed to save evaluation");
        return;
      }
      toast.success("Evaluation", "Structured evaluation saved");
      setRatingsByCriterion({});
      setCommentsByCriterion({});
      setSummary("");
      await load();
    } finally {
      setSavingEval(false);
    }
  };

  const handleReviewStatus = async (status: ReviewStatus) => {
    if (!user) return;
    setSavingReview(true);
    try {
      const token = await user.getIdToken();
      const res = await upsertCandidateReview(
        jobId,
        {
          candidateId,
          status,
          reviewSummary: reviewSummary.trim() || null,
        },
        token
      );
      if (!res.ok) {
        toast.error("Review", res.error || "Failed to update review status");
        return;
      }
      setReview((res.data.review || null) as CandidateReviewRequest | null);
      toast.success("Review", `Status updated: ${reviewStatusLabel(status)}`);
    } finally {
      setSavingReview(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading structured evaluation...
        </div>
      </section>
    );
  }

  if (!jobId) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-navy-900">Structured evaluation</h3>
        <p className="mt-1 text-xs text-slate-500">
          Open this candidate from a job context to manage scorecards and review workflow.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-navy-900">Structured evaluation</h3>
          <p className="text-xs text-slate-500">
            Waiting on: <span className="font-semibold">{attentionLine}</span>
          </p>
        </div>
        <div className="text-right text-xs">
          <p className="text-slate-500">Evaluations</p>
          <p className="font-semibold text-navy-900">{evaluationSummary.count}</p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
          Recommendation:{" "}
          <span className="font-semibold">
            {recommendationLabel(evaluationSummary.latestRecommendation)}
          </span>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
          Criteria coverage:{" "}
          <span className="font-semibold">
            {evaluationSummary.criteriaCovered}/{evaluationSummary.criteriaExpected || 0}
          </span>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
          Avg criterion rating:{" "}
          <span className="font-semibold">
            {evaluationSummary.avgRating == null ? "—" : evaluationSummary.avgRating.toFixed(1)}
          </span>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
          Review status:{" "}
          <span className="font-semibold">{reviewStatusLabel(review?.status)}</span>
        </div>
      </div>

      {activeCriteria.length === 0 ? (
        <p className="text-xs text-slate-500 mb-3">
          No active criteria configured for this job yet. Add criteria on the job overview page.
        </p>
      ) : (
        <div className="space-y-2 mb-3">
          {activeCriteria.map((criterion) => (
            <div key={criterion.id} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-navy-900">{criterion.label}</p>
                <select
                  value={ratingsByCriterion[criterion.id] || ""}
                  onChange={(e) =>
                    setRatingsByCriterion((prev) => ({ ...prev, [criterion.id]: e.target.value }))
                  }
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  <option value="">Rate</option>
                  <option value="1">1 - Low</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5 - Strong</option>
                </select>
              </div>
              <input
                value={commentsByCriterion[criterion.id] || ""}
                onChange={(e) =>
                  setCommentsByCriterion((prev) => ({ ...prev, [criterion.id]: e.target.value }))
                }
                placeholder="Optional note"
                className="mt-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
              />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 mb-3">
        <select
          value={recommendation}
          onChange={(e) => setRecommendation(e.target.value as OverallRecommendation)}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
        >
          {OVERALL_RECOMMENDATIONS.map((value) => (
            <option key={value} value={value}>
              Recommendation: {recommendationLabel(value)}
            </option>
          ))}
        </select>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
          placeholder="Overall summary of this candidate for this requisition..."
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
        />
        <button
          type="button"
          onClick={handleSaveEvaluation}
          disabled={savingEval}
          className="rounded-lg bg-navy-800 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-700 disabled:opacity-60"
        >
          {savingEval ? "Saving..." : "Save evaluation"}
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
        <p className="text-xs font-semibold text-navy-900 mb-1">Hiring manager review</p>
        <textarea
          value={reviewSummary}
          onChange={(e) => setReviewSummary(e.target.value)}
          rows={2}
          placeholder="Optional review context or debrief note..."
          className="mb-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
        />
        <div className="flex flex-wrap gap-1.5">
          {REVIEW_STATUS_ACTIONS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => handleReviewStatus(status)}
              disabled={savingReview}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                review?.status === status
                  ? "bg-violet-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {reviewStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
