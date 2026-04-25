"use client";

import { useEffect, useMemo, useState } from "react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useToast } from "@/components/NotificationSystem";
import { fetchCompanyTeamMembers, upsertReviewAssignment } from "@/lib/collaboration-client";
import type { ReviewAssignmentPriority, TeamMemberOption } from "@/lib/collaboration";

type Props = {
  jobId: string;
  candidateId: string;
  candidateName?: string;
  jobTitle?: string;
  onSuccess?: () => void;
  buttonClassName?: string;
};

export default function SendCandidateForReviewButton({
  jobId,
  candidateId,
  candidateName,
  jobTitle,
  onSuccess,
  buttonClassName,
}: Props) {
  const { user } = useFirebaseAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<TeamMemberOption[]>([]);
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [priority, setPriority] = useState<ReviewAssignmentPriority>("NORMAL");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!user || !open) return;
      const token = await user.getIdToken();
      const res = await fetchCompanyTeamMembers(token);
      if (res.ok) setMembers(res.data.members || []);
    };
    load();
  }, [user, open]);

  const hasMembers = useMemo(() => members.length > 0, [members.length]);

  const submit = async () => {
    if (!user || !assignedToUserId) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await upsertReviewAssignment(jobId, token, {
        candidateId,
        assignedToUserId,
        priority,
        message,
        status: "REQUESTED",
      });
      if (!res.ok) {
        toast.error("Could not send review", res.error || "Please try again.");
        return;
      }
      toast.success("Review request sent", "Teammate can now review this candidate.");
      setOpen(false);
      setMessage("");
      onSuccess?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClassName || "rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-navy-900 hover:bg-slate-50"}
      >
        Send for review
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 p-4">
          <div className="mx-auto mt-20 max-w-lg rounded-xl bg-white p-5 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-navy-900">Send candidate for review</h3>
            <p className="text-sm text-slate-600 mt-1">
              Ask a teammate to review {candidateName || "this candidate"}{jobTitle ? ` for ${jobTitle}` : ""}.
            </p>
            {!hasMembers ? (
              <p className="mt-4 text-sm text-slate-600">
                No teammates yet. Invite recruiters from <a className="font-semibold text-sky-700 hover:underline" href="/company/manage/recruiters">company settings</a>.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                <select
                  value={assignedToUserId}
                  onChange={(e) => setAssignedToUserId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Select reviewer</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role || "TEAM"})
                    </option>
                  ))}
                </select>
                <select value={priority} onChange={(e) => setPriority(e.target.value as ReviewAssignmentPriority)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="LOW">Low priority</option>
                  <option value="NORMAL">Normal priority</option>
                  <option value="HIGH">High priority</option>
                </select>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Instructions (optional)"
                  className="w-full min-h-[96px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy || !assignedToUserId}
                className="rounded-lg bg-navy-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Sending..." : "Send candidate for review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
