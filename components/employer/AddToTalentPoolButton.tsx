"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, ChevronDown, Loader2 } from "lucide-react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useToast } from "@/components/NotificationSystem";
import {
  addTalentPoolMember,
  createTalentPool,
  fetchTalentPools,
  type TalentPool,
} from "@/lib/talent-pools-client";

type Props = {
  candidateId: string;
  className?: string;
  buttonClassName?: string;
  /** When true, opens upward (e.g. bottom of card). */
  alignUp?: boolean;
  onAdded?: () => void;
};

function parseTags(raw: string): string[] {
  return raw
    .split(/[,]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);
}

export default function AddToTalentPoolButton({
  candidateId,
  className = "",
  buttonClassName = "",
  alignUp = false,
  onAdded,
}: Props) {
  const { user } = useFirebaseAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pools, setPools] = useState<TalentPool[]>([]);
  const [loadingPools, setLoadingPools] = useState(false);
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [newPoolName, setNewPoolName] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadPools = useCallback(async () => {
    if (!user) return;
    setLoadingPools(true);
    try {
      const token = await user.getIdToken();
      const res = await fetchTalentPools(token);
      if (res.ok) setPools(res.data.pools || []);
      else toast.error("Pools", res.error || "Could not load pools");
    } finally {
      setLoadingPools(false);
    }
  }, [user]);

  useEffect(() => {
    if (open) void loadPools();
  }, [open, loadPools]);

  const handleAdd = async () => {
    if (!user) return;
    const name = newPoolName.trim();
    const poolId = selectedPoolId === "__new__" ? "" : selectedPoolId;
    if (selectedPoolId === "__new__" && !name) {
      toast.error("Pools", "Enter a name for the new pool.");
      return;
    }
    if (selectedPoolId !== "__new__" && !poolId) {
      toast.error("Pools", "Choose a pool.");
      return;
    }

    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      let targetPoolId = poolId;
      if (selectedPoolId === "__new__") {
        const created = await createTalentPool(token, { name });
        if (!created.ok) {
          toast.error("Pools", created.error || "Could not create pool");
          return;
        }
        targetPoolId = created.data.pool.id;
      }

      const tags = parseTags(tagsInput);
      const addRes = await addTalentPoolMember(targetPoolId, token, {
        candidateId,
        notes: notes.trim() || undefined,
        tags: tags.length ? tags : undefined,
      });
      if (!addRes.ok) {
        toast.error("Pools", addRes.error || "Could not add to pool");
        return;
      }
      toast.success("Pools", "Saved to your talent pool.");
      setOpen(false);
      setNotes("");
      setTagsInput("");
      setNewPoolName("");
      setSelectedPoolId("");
      onAdded?.();
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          buttonClassName ||
          "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-navy-800 hover:bg-slate-50"
        }
      >
        <Users className="h-3.5 w-3.5" />
        Add to pool
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default bg-transparent" aria-label="Close" onClick={() => setOpen(false)} />
          <div
            className={`absolute z-50 w-[min(100vw-2rem,20rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg ${
              alignUp ? "bottom-full mb-1 right-0" : "top-full mt-1 right-0"
            }`}
          >
            <p className="text-xs font-semibold text-navy-900 mb-2">Talent pool</p>
            {loadingPools ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading pools…
              </div>
            ) : (
              <>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Pool</label>
                <select
                  value={selectedPoolId}
                  onChange={(e) => setSelectedPoolId(e.target.value)}
                  className="w-full mb-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800"
                >
                  <option value="">Select…</option>
                  {pools.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value="__new__">+ Create new pool…</option>
                </select>

                {selectedPoolId === "__new__" && (
                  <input
                    value={newPoolName}
                    onChange={(e) => setNewPoolName(e.target.value)}
                    placeholder="New pool name"
                    className="w-full mb-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                  />
                )}

                <label className="block text-[11px] font-medium text-slate-600 mb-1">Why adding? (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full mb-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                  placeholder="Short note for your team"
                />

                <label className="block text-[11px] font-medium text-slate-600 mb-1">Tags (optional, comma-separated)</label>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full mb-3 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                  placeholder="e.g. strong backend, needs visa"
                />

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleAdd()}
                  className="w-full rounded-lg bg-navy-800 py-2 text-xs font-semibold text-white hover:bg-navy-700 disabled:opacity-50"
                >
                  {submitting ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
