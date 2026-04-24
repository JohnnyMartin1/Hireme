"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/NotificationSystem";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { type RecruiterNote } from "@/lib/firebase-firestore";

function formatNoteDate(value: unknown): string {
  const asDate = (value as any)?.toDate ? (value as any).toDate() : value;
  const d = asDate ? new Date(asDate as any) : null;
  if (!d || Number.isNaN(d.getTime())) return "just now";
  return d.toLocaleDateString();
}

export default function RecruiterNotesPanel({
  jobId,
  candidateId,
  userId,
  title = "Recruiter notes",
  compact = false,
}: {
  jobId: string;
  candidateId: string;
  userId: string;
  title?: string;
  compact?: boolean;
}) {
  const toast = useToast();
  const { user } = useFirebaseAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<RecruiterNote[]>([]);

  const canCreate = useMemo(() => Boolean(draft.trim()), [draft]);

  const getAuthHeaders = async () => {
    if (!user) return null;
    const token = await user.getIdToken();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const loadNotes = async () => {
    if (!jobId || !candidateId) return;
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setNotes([]);
        return;
      }
      const res = await fetch(`/api/job/${encodeURIComponent(jobId)}/notes?candidateId=${encodeURIComponent(candidateId)}`, {
        method: "GET",
        headers,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Notes", String(payload?.error || "Failed to load notes"));
        setNotes([]);
      } else {
        setNotes((payload?.notes || []) as RecruiterNote[]);
      }
    } catch (error: any) {
      toast.error("Notes", String(error?.message || "Failed to load notes"));
      setNotes([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, candidateId, user?.uid]);

  const handleCreate = async () => {
    if (!canCreate) return;
    setSaving(true);
    let error: string | null = null;
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        error = "Not authenticated";
      } else {
        const res = await fetch(`/api/job/${encodeURIComponent(jobId)}/notes`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            candidateId,
            authorUserId: userId,
            body: draft.trim(),
          }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) error = String(payload?.error || "Failed to create note");
      }
    } catch (e: any) {
      error = String(e?.message || "Failed to create note");
    }
    setSaving(false);
    if (error) {
      toast.error("Notes", error);
      return;
    }
    setDraft("");
    await loadNotes();
  };

  const handleStartEdit = (note: RecruiterNote) => {
    setEditingId(note.id);
    setDraft(note.body || "");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !draft.trim()) return;
    setSaving(true);
    let error: string | null = null;
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        error = "Not authenticated";
      } else {
        const res = await fetch(`/api/job/${encodeURIComponent(jobId)}/notes`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            noteId: editingId,
            body: draft.trim(),
          }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) error = String(payload?.error || "Failed to update note");
      }
    } catch (e: any) {
      error = String(e?.message || "Failed to update note");
    }
    setSaving(false);
    if (error) {
      toast.error("Notes", error);
      return;
    }
    setEditingId(null);
    setDraft("");
    await loadNotes();
  };

  const handleDelete = async (noteId: string) => {
    setSaving(true);
    let error: string | null = null;
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        error = "Not authenticated";
      } else {
        const res = await fetch(`/api/job/${encodeURIComponent(jobId)}/notes`, {
          method: "DELETE",
          headers,
          body: JSON.stringify({ noteId }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) error = String(payload?.error || "Failed to delete note");
      }
    } catch (e: any) {
      error = String(e?.message || "Failed to delete note");
    }
    setSaving(false);
    if (error) {
      toast.error("Notes", error);
      return;
    }
    if (editingId === noteId) {
      setEditingId(null);
      setDraft("");
    }
    await loadNotes();
  };

  return (
    <section className={`rounded-xl border border-slate-200 bg-white ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
        <span className="text-xs text-slate-500">{notes.length} notes</span>
      </div>

      <div className="space-y-2 mb-3">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading notes...
          </div>
        ) : notes.length === 0 ? (
          <p className="text-xs text-slate-500">No recruiter notes yet for this candidate on this job.</p>
        ) : (
          notes.slice(0, compact ? 2 : notes.length).map((note) => {
            const mine = note.authorUserId === userId;
            return (
              <article key={note.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.body}</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-[11px] text-slate-500">Updated {formatNoteDate(note.updatedAt || note.createdAt)}</p>
                  {mine && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(note)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 hover:text-sky-900"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 hover:text-rose-900"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add recruiter note: rationale, concerns, follow-up, interview signals..."
          rows={compact ? 2 : 3}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
          disabled={saving}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={editingId ? handleSaveEdit : handleCreate}
            disabled={saving || !canCreate}
            className="inline-flex items-center gap-1 rounded-lg bg-navy-800 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-700 disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" />
            {editingId ? "Save note" : "Add note"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setDraft("");
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
