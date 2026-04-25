"use client";

import { useEffect, useMemo, useState } from "react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useToast } from "@/components/NotificationSystem";
import { fetchCompanyTeamMembers } from "@/lib/collaboration-client";
import { patchJobInterviewById, upsertJobInterview } from "@/lib/communication-client";
import type { InterviewEvent } from "@/lib/communication-workflow";

const TYPE_OPTIONS = [
  { value: "PHONE_SCREEN", label: "Phone screen" },
  { value: "VIDEO", label: "Video" },
  { value: "ONSITE", label: "Onsite" },
  { value: "FINAL_ROUND", label: "Final round" },
  { value: "CUSTOM", label: "Custom" },
] as const;

const TITLE_BY_TYPE: Record<string, string> = {
  PHONE_SCREEN: "Initial Phone Screen",
  VIDEO: "Video Interview",
  ONSITE: "Onsite Interview",
  FINAL_ROUND: "Final Round Interview",
  CUSTOM: "Interview",
};

type Props = {
  jobId: string;
  candidateId: string;
  candidateName?: string;
  isOpen: boolean;
  onClose: () => void;
  existingInterview?: InterviewEvent | null;
  onSaved?: (interview: InterviewEvent) => void;
};

export default function ScheduleInterviewModal({
  jobId,
  candidateId,
  candidateName,
  isOpen,
  onClose,
  existingInterview,
  onSaved,
}: Props) {
  const { user } = useFirebaseAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; role?: string }>>([]);
  const [type, setType] = useState("VIDEO");
  const [title, setTitle] = useState(TITLE_BY_TYPE.VIDEO);
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [interviewerIds, setInterviewerIds] = useState<string[]>([]);
  const [locationType, setLocationType] = useState<"VIDEO" | "PHONE" | "IN_PERSON">("VIDEO");
  const [locationValue, setLocationValue] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState<boolean | null>(null);
  const [googleCalendarEmail, setGoogleCalendarEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    const load = async () => {
      const token = await user.getIdToken();
      const res = await fetchCompanyTeamMembers(token);
      if (res.ok) setTeamMembers((res.data.members || []).map((m: any) => ({ id: m.id, name: m.name, role: m.role })));
      const statusRes = await fetch(`/api/integrations/google-calendar/status?token=${encodeURIComponent(token)}`);
      const statusPayload = await statusRes.json().catch(() => ({}));
      if (statusRes.ok) {
        setGoogleCalendarConnected(Boolean(statusPayload.connected));
        setGoogleCalendarEmail(statusPayload.connectedEmail ? String(statusPayload.connectedEmail) : null);
      } else {
        setGoogleCalendarConnected(false);
        setGoogleCalendarEmail(null);
      }
    };
    load();
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) return;
    if (!existingInterview) {
      setType("VIDEO");
      setTitle(TITLE_BY_TYPE.VIDEO);
      setDurationMinutes("30");
      setInterviewerIds([]);
      setLocationType("VIDEO");
      setLocationValue("");
      setScheduledDate("");
      setScheduledTime("");
      setDescription("");
      setNotes("");
      return;
    }
    const iv: any = existingInterview;
    const when = iv?.scheduledAt?.toDate ? iv.scheduledAt.toDate() : iv?.scheduledAt ? new Date(iv.scheduledAt) : null;
    setType(String(iv?.type || "VIDEO"));
    setTitle(String(iv?.title || TITLE_BY_TYPE[String(iv?.type || "VIDEO")] || "Interview"));
    setDurationMinutes(String(iv?.durationMinutes || 30));
    setInterviewerIds(Array.isArray(iv?.interviewerIds) ? iv.interviewerIds.map((x: unknown) => String(x)) : []);
    setLocationType(String(iv?.location?.type || "VIDEO") as "VIDEO" | "PHONE" | "IN_PERSON");
    setLocationValue(String(iv?.location?.value || iv?.location || ""));
    if (when && !Number.isNaN(when.getTime())) {
      setScheduledDate(when.toISOString().slice(0, 10));
      setScheduledTime(when.toTimeString().slice(0, 5));
    }
    setDescription(String(iv?.description || ""));
    setNotes(String(iv?.notes || ""));
    setTimezone(String(iv?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"));
  }, [isOpen, existingInterview]);

  const scheduledAtIso = useMemo(() => {
    if (!scheduledDate || !scheduledTime) return null;
    const d = new Date(`${scheduledDate}T${scheduledTime}:00`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }, [scheduledDate, scheduledTime]);

  const onSubmit = async () => {
    if (!user || !scheduledAtIso) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const payload = {
        candidateId,
        type,
        title: title.trim() || TITLE_BY_TYPE[type] || "Interview",
        description: description.trim() || null,
        interviewerIds,
        status: existingInterview ? "SCHEDULED" : "SCHEDULED",
        scheduledAt: scheduledAtIso,
        durationMinutes: Number(durationMinutes || 30),
        timezone,
        location: { type: locationType, value: locationValue.trim() },
        notes: notes.trim(),
      };
      const res = existingInterview?.id
        ? await patchJobInterviewById(jobId, existingInterview.id, token, payload)
        : await upsertJobInterview(jobId, token, payload);
      if (!res.ok) {
        toast.error("Could not schedule interview", res.error || "Please try again.");
        return;
      }
      const syncStatus = String((res.data.interview as any)?.calendarSyncStatus || "NOT_SYNCED");
      if (syncStatus === "FAILED") {
        toast.warning("Interview scheduled", "Calendar sync failed. Internal interview was saved.");
      }
      const pipelineRes = await fetch(`/api/job/${jobId}/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ candidateId, stage: "INTERVIEW" }),
      });
      if (!pipelineRes.ok) {
        toast.warning("Interview saved", "Pipeline stage could not be updated automatically.");
      } else {
        toast.success("Interview scheduled", "Candidate moved to Interview stage.");
      }
      onSaved?.(res.data.interview as InterviewEvent);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 p-4">
      <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-navy-900">{existingInterview ? "Reschedule interview" : "Schedule interview"}</h3>
        <p className="text-sm text-slate-600 mt-1">Candidate: {candidateName || "Candidate"}</p>
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          {googleCalendarConnected ? (
            <div className="flex items-center justify-between gap-3">
              <p>This interview will be added to your Google Calendar{googleCalendarEmail ? ` (${googleCalendarEmail})` : ""}.</p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p>Connect Google Calendar to create real calendar events and send invites.</p>
              <button
                type="button"
                onClick={async () => {
                  if (!user) return;
                  const token = await user.getIdToken();
                  window.location.href = `/api/integrations/google-calendar/connect?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(window.location.pathname + window.location.search + "#integrations")}`;
                }}
                className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100"
              >
                Connect Google Calendar
              </button>
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Interview type</label>
            <select value={type} onChange={(e) => { setType(e.target.value); if (!title.trim()) setTitle(TITLE_BY_TYPE[e.target.value]); }} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Duration</label>
            <select value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Interviewers</label>
            <select
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                setInterviewerIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Add interviewer</option>
              {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {interviewerIds.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {interviewerIds.map((id) => {
                  const m = teamMembers.find((x) => x.id === id);
                  return <button key={id} type="button" onClick={() => setInterviewerIds((prev) => prev.filter((x) => x !== id))} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px]">{m?.name || id} ×</button>;
                })}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Location type</label>
            <select value={locationType} onChange={(e) => setLocationType(e.target.value as any)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="VIDEO">Video link</option>
              <option value="PHONE">Phone</option>
              <option value="IN_PERSON">In person</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Location value</label>
            <input value={locationValue} onChange={(e) => setLocationValue(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Zoom link / phone / address" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Date</label>
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Time</label>
            <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Timezone</label>
            <input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes" className="mt-3 w-full min-h-[80px] rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          {scheduledAtIso ? `Scheduling for ${new Date(scheduledAtIso).toLocaleString()} (${timezone})` : "Select date and time to continue."}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">Cancel</button>
          <button type="button" onClick={onSubmit} disabled={busy || !scheduledAtIso} className="rounded-lg bg-navy-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? "Saving..." : existingInterview ? "Update interview" : "Schedule interview"}
          </button>
        </div>
      </div>
    </div>
  );
}
