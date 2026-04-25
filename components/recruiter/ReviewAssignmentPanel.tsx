"use client";

import { useEffect, useState } from "react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useToast } from "@/components/NotificationSystem";
import { patchReviewAssignment, fetchReviewAssignments } from "@/lib/collaboration-client";
import { getDocument } from "@/lib/firebase-firestore";
import { REVIEW_DECISION_OPTIONS } from "@/lib/collaboration";
import ReviewAssignmentStatusBadge from "@/components/recruiter/ReviewAssignmentStatusBadge";

export default function ReviewAssignmentPanel({ jobId, candidateId }: { jobId: string; candidateId: string }) {
  const { user } = useFirebaseAuth();
  const toast = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [nameById, setNameById] = useState<Record<string, string>>({});
  const [decisionById, setDecisionById] = useState<Record<string, string>>({});
  const [feedbackById, setFeedbackById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetchReviewAssignments(jobId, token, candidateId);
    if (!res.ok) return;
    setAssignments(res.data.assignments || []);
  };

  useEffect(() => {
    load();
  }, [user, jobId, candidateId]);

  useEffect(() => {
    const hydrate = async () => {
      const ids = Array.from(
        new Set(assignments.flatMap((a) => [String(a.assignedToUserId || ""), String(a.requestedByUserId || "")]).filter(Boolean))
      );
      const rows = await Promise.all(
        ids.map(async (id) => {
          const { data } = await getDocument("users", id);
          const name = data ? `${(data as any).firstName || ""} ${(data as any).lastName || ""}`.trim() || String((data as any).email || "Teammate") : "Teammate";
          return [id, name] as const;
        })
      );
      setNameById(Object.fromEntries(rows));
    };
    if (assignments.length > 0) hydrate();
  }, [assignments]);

  const complete = async (assignmentId: string, status: "COMPLETED" | "DECLINED") => {
    if (!user) return;
    setBusyId(assignmentId);
    try {
      const token = await user.getIdToken();
      const res = await patchReviewAssignment(jobId, assignmentId, token, {
        status,
        decision: decisionById[assignmentId] || null,
        feedbackSummary: feedbackById[assignmentId] || "",
      });
      if (!res.ok) {
        toast.error("Could not update review", res.error || "Please try again.");
        return;
      }
      toast.success(status === "COMPLETED" ? "Review completed" : "Review declined");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-bold text-navy-900 mb-2">Review assignments</h3>
      <div className="space-y-2">
        {assignments.length === 0 ? (
          <p className="text-xs text-slate-500">No review assignments yet.</p>
        ) : (
          assignments.map((a) => {
            const mine = String(a.assignedToUserId || "") === String(user?.uid || "");
            return (
              <div key={a.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <ReviewAssignmentStatusBadge status={a.status} />
                  <span className="text-[11px] font-semibold text-slate-700">Priority: {String(a.priority || "NORMAL").toLowerCase()}</span>
                  <span className="text-[11px] text-slate-600">Assigned: {nameById[a.assignedToUserId] || "Teammate"}</span>
                </div>
                {a.message ? <p className="text-xs text-slate-700 mt-1">{a.message}</p> : null}
                {a.feedbackSummary ? <p className="text-xs text-slate-700 mt-1">Feedback: {a.feedbackSummary}</p> : null}
                {mine && String(a.status || "").toUpperCase() !== "COMPLETED" && String(a.status || "").toUpperCase() !== "DECLINED" ? (
                  <div className="mt-2 space-y-2">
                    <select
                      value={decisionById[a.id] || ""}
                      onChange={(e) => setDecisionById((prev) => ({ ...prev, [a.id]: e.target.value }))}
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                    >
                      <option value="">Select decision</option>
                      {REVIEW_DECISION_OPTIONS.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                    <textarea
                      value={feedbackById[a.id] || ""}
                      onChange={(e) => setFeedbackById((prev) => ({ ...prev, [a.id]: e.target.value }))}
                      placeholder="Feedback summary"
                      className="w-full min-h-[68px] rounded-md border border-slate-200 px-2 py-1 text-xs"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => complete(a.id, "COMPLETED")} disabled={busyId === a.id} className="rounded-md bg-navy-800 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-60">
                        Complete review
                      </button>
                      <button type="button" onClick={() => complete(a.id, "DECLINED")} disabled={busyId === a.id} className="rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700 disabled:opacity-60">
                        Decline review
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
