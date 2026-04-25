"use client";

import { useEffect, useMemo, useState } from "react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useToast } from "@/components/NotificationSystem";
import { createInternalComment, fetchCompanyTeamMembers, fetchInternalComments } from "@/lib/collaboration-client";
import { getDocument } from "@/lib/firebase-firestore";
import type { CandidateInternalComment, TeamMemberOption } from "@/lib/collaboration";

export default function InternalCommentsPanel({ jobId, candidateId }: { jobId: string; candidateId: string }) {
  const { user } = useFirebaseAuth();
  const toast = useToast();
  const [comments, setComments] = useState<CandidateInternalComment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [authorNameById, setAuthorNameById] = useState<Record<string, string>>({});
  const [mentions, setMentions] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const [cRes, mRes] = await Promise.all([
      fetchInternalComments(jobId, token, candidateId),
      fetchCompanyTeamMembers(token),
    ]);
    if (cRes.ok) setComments(cRes.data.comments || []);
    if (mRes.ok) setTeamMembers(mRes.data.members || []);
  };

  useEffect(() => {
    load();
  }, [user, jobId, candidateId]);

  useEffect(() => {
    const loadNames = async () => {
      const ids = Array.from(new Set(comments.map((c) => c.authorUserId))).filter(Boolean);
      const pairs = await Promise.all(
        ids.map(async (id) => {
          const { data } = await getDocument("users", id);
          const name = data ? `${(data as any).firstName || ""} ${(data as any).lastName || ""}`.trim() || String((data as any).email || "Teammate") : "Teammate";
          return [id, name] as const;
        })
      );
      setAuthorNameById(Object.fromEntries(pairs));
    };
    if (comments.length > 0) loadNames();
  }, [comments]);

  const submit = async () => {
    if (!user || !body.trim()) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await createInternalComment(jobId, token, {
        candidateId,
        body: body.trim(),
        mentions,
      });
      if (!res.ok) {
        toast.error("Could not post comment", res.error || "Please try again.");
        return;
      }
      toast.success("Internal comment posted");
      setBody("");
      setMentions([]);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const mentionLabel = useMemo(() => "Only visible to your hiring team.", []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-navy-900">Internal comments</h3>
        <p className="text-xs text-slate-500">{mentionLabel}</p>
      </div>
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-500">No internal comments yet.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">{authorNameById[comment.authorUserId] || "Teammate"}</span>
                {" · "}
                {comment.createdAt ? new Date((comment.createdAt as any)?.toDate ? (comment.createdAt as any).toDate() : comment.createdAt as any).toLocaleString() : "Now"}
              </p>
              <p className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{comment.body}</p>
            </div>
          ))
        )}
      </div>
      <div className="mt-3 space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add an internal note or @mention a teammate..."
          className="w-full min-h-[90px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <select
          value=""
          onChange={(e) => {
            const id = e.target.value;
            if (!id) return;
            setMentions((prev) => (prev.includes(id) ? prev : [...prev, id]));
          }}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
        >
          <option value="">Add mention (optional)</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        {mentions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {mentions.map((id) => {
              const m = teamMembers.find((x) => x.id === id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMentions((prev) => prev.filter((x) => x !== id))}
                  className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] text-sky-800"
                >
                  @{m?.name || id} ×
                </button>
              );
            })}
          </div>
        )}
        <button type="button" onClick={submit} disabled={busy || !body.trim()} className="rounded-lg bg-navy-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
          {busy ? "Posting..." : "Post internal comment"}
        </button>
      </div>
    </div>
  );
}
