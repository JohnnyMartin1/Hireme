"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Tag, Trash2 } from "lucide-react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useToast } from "@/components/NotificationSystem";
import {
  fetchCandidatePoolMemberships,
  removeTalentPoolMember,
  updateTalentPoolMember,
  type TalentPoolMember,
} from "@/lib/talent-pools-client";
import { getEmployerPoolDetailUrl } from "@/lib/navigation";
import AddToTalentPoolButton from "@/components/employer/AddToTalentPoolButton";

type Row = TalentPoolMember & { poolName: string };

export default function CandidateTalentPoolsSection({ candidateId }: { candidateId: string }) {
  const { user } = useFirebaseAuth();
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetchCandidatePoolMemberships(candidateId, token);
      if (res.ok) setRows((res.data.memberships || []) as Row[]);
      else setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user, candidateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveTags = async (row: Row) => {
    if (!user) return;
    const tags = tagDraft
      .split(/[,]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 20);
    setBusyId(row.id);
    try {
      const token = await user.getIdToken();
      const res = await updateTalentPoolMember(String(row.poolId), row.id, token, { tags });
      if (!res.ok) {
        toast.error("Pools", res.error || "Could not update tags");
        return;
      }
      toast.success("Pools", "Tags updated.");
      setEditingTagsId(null);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (row: Row) => {
    if (!user) return;
    setBusyId(row.id);
    try {
      const token = await user.getIdToken();
      const res = await removeTalentPoolMember(String(row.poolId), row.id, token);
      if (!res.ok) {
        toast.error("Pools", res.error || "Could not remove");
        return;
      }
      toast.success("Pools", "Removed from pool.");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (!user) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-navy-900">Talent pools</h2>
          <p className="text-sm text-slate-600">Long-term lists — separate from job pipeline.</p>
        </div>
        <AddToTalentPoolButton candidateId={candidateId} onAdded={() => void load()} />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading pool memberships…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500 py-2">Not in any pool yet. Use &quot;Add to pool&quot; to remember this candidate.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={getEmployerPoolDetailUrl(String(row.poolId))}
                    className="font-semibold text-navy-800 hover:underline"
                  >
                    {row.poolName}
                  </Link>
                  {row.notes ? <p className="text-xs text-slate-600 mt-1 max-w-prose">{String(row.notes)}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => {
                      setEditingTagsId(editingTagsId === row.id ? null : row.id);
                      setTagDraft(Array.isArray(row.tags) ? row.tags.join(", ") : "");
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Tag className="h-3 w-3" />
                    Tags
                  </button>
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => void remove(row)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </div>
              </div>
              {Array.isArray(row.tags) && row.tags.length > 0 && editingTagsId !== row.id && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {row.tags.map((t) => (
                    <span key={t} className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] text-navy-800">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {editingTagsId === row.id && (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                    placeholder="Comma-separated tags"
                  />
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => void saveTags(row)}
                    className="rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-700 disabled:opacity-50"
                  >
                    Save tags
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
