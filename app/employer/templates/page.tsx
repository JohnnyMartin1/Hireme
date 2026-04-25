"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import {
  deleteMessageTemplate,
  fetchMessageTemplates,
  patchMessageTemplate,
  upsertMessageTemplate,
} from "@/lib/communication-client";
import { TEMPLATE_TYPES, type MessageTemplate, type MessageTemplateType } from "@/lib/communication-workflow";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/firebase-firestore";
import { getDashboardUrl, getMessagesUrl } from "@/lib/navigation";

export default function EmployerTemplatesPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [draftName, setDraftName] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftType, setDraftType] = useState<MessageTemplateType>("CUSTOM");
  const [draftStage, setDraftStage] = useState<PipelineStage | "">("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
    if (profile && profile.role !== "EMPLOYER" && profile.role !== "RECRUITER") {
      router.push("/home/seeker");
    }
  }, [loading, user, profile, router]);

  const load = async () => {
    if (!user) return;
    setLoadingList(true);
    try {
      const token = await user.getIdToken();
      const res = await fetchMessageTemplates(token);
      if (res.ok) setTemplates((res.data.templates || []) as MessageTemplate[]);
      else setTemplates([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (user && profile && (profile.role === "EMPLOYER" || profile.role === "RECRUITER")) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, profile?.role]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (filterType !== "all" && String(t.type) !== filterType) return false;
      if (filterStage === "none" && t.stage) return false;
      if (filterStage !== "all" && filterStage !== "none" && String(t.stage || "") !== filterStage) return false;
      return true;
    });
  }, [templates, filterType, filterStage]);

  const handleCreate = async () => {
    if (!user || !draftName.trim() || !draftBody.trim()) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await upsertMessageTemplate(token, {
        name: draftName.trim(),
        body: draftBody.trim(),
        type: draftType,
        stage: draftStage || null,
        scope: "USER",
      });
      if (!res.ok) return;
      setDraftName("");
      setDraftBody("");
      setDraftType("CUSTOM");
      setDraftStage("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (t: MessageTemplate) => {
    if (!user) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      await patchMessageTemplate(token, {
        id: t.id,
        name: t.name,
        body: t.body,
        type: t.type,
        stage: t.stage ?? null,
      });
      setEditingId(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm("Delete this template?")) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      await deleteMessageTemplate(token, id);
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (!user || !profile) return null;

  return (
    <main className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link
            href={getMessagesUrl()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-navy-800 hover:text-navy-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Messages
          </Link>
          <Link href={getDashboardUrl()} className="text-sm font-medium text-slate-500 hover:text-navy-800 hover:underline">
            Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-navy-900 mb-1">Message templates</h1>
        <p className="text-sm text-slate-600 mb-6">
          Reusable snippets for outreach and follow-up. Templates are stored per your account (and company-wide
          templates when created with company scope from the API).
        </p>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm mb-6">
          <h2 className="text-sm font-bold text-navy-900 mb-3">Create template</h2>
          <div className="grid grid-cols-1 gap-2">
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Name"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <select
                value={draftType}
                onChange={(e) => setDraftType(e.target.value as MessageTemplateType)}
                className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
              >
                {TEMPLATE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={draftStage}
                onChange={(e) => setDraftStage((e.target.value || "") as PipelineStage | "")}
                className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
              >
                <option value="">Any stage</option>
                {PIPELINE_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              placeholder="Body"
              rows={5}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-sans"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !draftName.trim() || !draftBody.trim()}
              className="self-start rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-50"
            >
              Save template
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
              >
                <option value="all">All types</option>
                {TEMPLATE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Stage</label>
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="none">No stage tag</option>
                {PIPELINE_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingList ? (
            <div className="flex items-center gap-2 text-slate-600 text-sm py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500 py-6">No templates match these filters.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <li key={t.id} className="py-4">
                  {editingId === t.id ? (
                    <div className="space-y-2">
                      <input
                        defaultValue={t.name}
                        id={`name-${t.id}`}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                      />
                      <textarea
                        defaultValue={t.body}
                        id={`body-${t.id}`}
                        rows={4}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm font-sans"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => {
                            const name = (document.getElementById(`name-${t.id}`) as HTMLInputElement)?.value;
                            const body = (document.getElementById(`body-${t.id}`) as HTMLTextAreaElement)?.value;
                            handleSaveEdit({ ...t, name: name?.trim() || t.name, body: body?.trim() || t.body });
                          }}
                          className="rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-navy-900 truncate">{t.name}</p>
                        <p className="text-xs text-slate-500">
                          {t.type}
                          {t.stage ? ` · ${t.stage}` : ""}
                          {t.companyId ? " · company" : " · personal"}
                        </p>
                        <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap line-clamp-4">{t.body}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingId(t.id)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id)}
                          className="rounded-lg border border-slate-300 bg-slate-50 p-2 text-slate-700 hover:bg-slate-100"
                          aria-label="Delete template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
