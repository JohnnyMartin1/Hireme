"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  jobTitle?: string;
  candidateName?: string;
  isOpen: boolean;
  onClose: () => void;
  existingInterview?: InterviewEvent | null;
  defaultStatus?: "PROPOSED" | "SCHEDULED" | "CONFIRMED";
  onSaved?: (interview: InterviewEvent) => void;
};

export default function ScheduleInterviewModal({
  jobId,
  candidateId,
  jobTitle,
  candidateName,
  isOpen,
  onClose,
  existingInterview,
  defaultStatus,
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
  const [interviewerQuery, setInterviewerQuery] = useState("");
  const [status, setStatus] = useState<"PROPOSED" | "SCHEDULED" | "CONFIRMED">(defaultStatus || "SCHEDULED");
  const [calendarStatus, setCalendarStatus] = useState<{
    loading: boolean;
    google: { connected: boolean; email: string | null; syncReady: boolean };
    microsoft: { connected: boolean; email: string | null; syncReady: boolean };
  }>({
    loading: true,
    google: { connected: false, email: null, syncReady: false },
    microsoft: { connected: false, email: null, syncReady: false },
  });
  const [calendarProvider, setCalendarProvider] = useState<"google" | "microsoft" | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    const load = async () => {
      const token = await user.getIdToken();
      const res = await fetchCompanyTeamMembers(token);
      if (res.ok) setTeamMembers((res.data.members || []).map((m: any) => ({ id: m.id, name: m.name, role: m.role })));
      const statusRes = await fetch("/api/integrations/google-calendar/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const msRes = await fetch("/api/integrations/microsoft-calendar/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const googlePayload = await statusRes.json().catch(() => ({}));
      const msPayload = await msRes.json().catch(() => ({}));
      const next = {
        loading: false,
        google: {
          connected: Boolean(googlePayload.connected),
          email: googlePayload.connectedEmail ? String(googlePayload.connectedEmail) : null,
          syncReady: Boolean(googlePayload.syncReady),
        },
        microsoft: {
          connected: Boolean(msPayload.connected),
          email: msPayload.connectedEmail ? String(msPayload.connectedEmail) : null,
          syncReady: Boolean(msPayload.syncReady),
        },
      };
      setCalendarStatus(next);
      if (next.google.syncReady) setCalendarProvider("google");
      else if (next.microsoft.syncReady) setCalendarProvider("microsoft");
      else setCalendarProvider(null);
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
      setStatus(defaultStatus || "SCHEDULED");
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
    setStatus(String(iv?.status || defaultStatus || "SCHEDULED").toUpperCase() as "PROPOSED" | "SCHEDULED" | "CONFIRMED");
    const provider = String(iv?.calendarProvider || "").toLowerCase();
    if (provider === "google" || provider === "microsoft") setCalendarProvider(provider);
    setTimezone(String(iv?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"));
  }, [isOpen, existingInterview, defaultStatus]);

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
        status,
        scheduledAt: scheduledAtIso,
        durationMinutes: Number(durationMinutes || 30),
        timezone,
        location: { type: locationType, value: locationValue.trim() },
        notes: notes.trim(),
        calendarProvider,
      };
      const res = existingInterview?.id
        ? await patchJobInterviewById(jobId, existingInterview.id, token, payload)
        : await upsertJobInterview(jobId, token, payload);
      if (!res.ok) {
        toast.error("Could not schedule interview", res.error || "Please try again.");
        return;
      }
      const saved = res.data.interview as any;
      const syncStatus = String(saved?.calendarSyncStatus || "NOT_SYNCED");
      if (syncStatus === "FAILED") {
        toast.warning("Interview scheduled", "Calendar sync failed. Internal interview was saved.");
      } else if (syncStatus === "SYNCED") {
        const label = String(saved?.calendarProvider || "").toLowerCase() === "microsoft" ? "Outlook Calendar" : "Google Calendar";
        toast.success("Interview saved", `Interview synced to ${label}.`);
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

  const allTimezones =
    typeof Intl !== "undefined" && typeof (Intl as any).supportedValuesOf === "function"
      ? ((Intl as any).supportedValuesOf("timeZone") as string[])
      : [Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", "UTC"];
  const filteredMembers = teamMembers.filter((m) =>
    m.name.toLowerCase().includes(interviewerQuery.toLowerCase())
  );
  const canSyncCalendar = calendarStatus.google.syncReady || calendarStatus.microsoft.syncReady;
  const primaryLabel =
    existingInterview?.id
      ? "Update interview"
      : status === "PROPOSED"
        ? "Propose interview"
        : status === "CONFIRMED"
          ? "Confirm interview"
          : "Schedule interview";
  const selectedProviderLabel =
    calendarProvider === "microsoft"
      ? "Outlook Calendar"
      : calendarProvider === "google"
        ? "Google Calendar"
        : "Not connected";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4">
      <div className="mx-auto mt-4 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-6 py-4">
          <h3 className="text-xl font-bold text-navy-900">{existingInterview ? "Edit interview" : "Schedule interview"}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {candidateName || "Candidate"} {jobTitle ? `• ${jobTitle}` : ""}
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interview details</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
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
            <input
              value={interviewerQuery}
              onChange={(e) => setInterviewerQuery(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Search team members"
            />
            <div className="mt-1 max-h-28 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
              {filteredMembers.slice(0, 8).map((m) => (
                <label key={m.id} className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={interviewerIds.includes(m.id)}
                    onChange={() =>
                      setInterviewerIds((prev) => (prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id]))
                    }
                  />
                  <span className="text-slate-700">{m.name}</span>
                </label>
              ))}
            </div>
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
            <label className="text-xs font-semibold text-slate-600">Meeting type</label>
            <select value={locationType} onChange={(e) => setLocationType(e.target.value as any)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="VIDEO">Video link</option>
              <option value="PHONE">Phone</option>
              <option value="IN_PERSON">In person</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Location / link</label>
            <input value={locationValue} onChange={(e) => setLocationValue(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Zoom link / phone / address" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Interview status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="PROPOSED">Proposed</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="CONFIRMED">Confirmed</option>
                </select>
              </div>
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes" className="mt-3 w-full min-h-[84px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date and time</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
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
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  {allTimezones.map((tz) => (
                    <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { id: "in30", label: "In 30 min", deltaMins: 30 },
                { id: "todaypm", label: "Today 3:00 PM", set: [15, 0] as const },
                { id: "tomorrowam", label: "Tomorrow 10:00 AM", setTomorrow: [10, 0] as const },
              ].map((p: { id: string; label: string; deltaMins?: number; set?: readonly [number, number]; setTomorrow?: readonly [number, number] }) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    if (typeof p.deltaMins === "number") d.setMinutes(d.getMinutes() + p.deltaMins);
                    if (p.set) d.setHours(p.set[0], p.set[1], 0, 0);
                    if (p.setTomorrow) {
                      d.setDate(d.getDate() + 1);
                      d.setHours(p.setTomorrow[0], p.setTomorrow[1], 0, 0);
                    }
                    setScheduledDate(d.toISOString().slice(0, 10));
                    setScheduledTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
                  }}
                  className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Review and calendar sync</p>
            {calendarStatus.loading ? (
              <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">Checking calendar connections...</div>
            ) : (
              <div className="mt-2 space-y-2">
                <label className="block rounded-lg border border-slate-200 bg-white p-3 text-sm">
                  <input
                    type="radio"
                    name="provider"
                    checked={calendarProvider === "google"}
                    onChange={() => setCalendarProvider("google")}
                    disabled={!calendarStatus.google.syncReady}
                    className="mr-2"
                  />
                  Google Calendar {calendarStatus.google.connected ? `(${calendarStatus.google.email || "connected"})` : "(not connected)"}
                </label>
                <label className="block rounded-lg border border-slate-200 bg-white p-3 text-sm">
                  <input
                    type="radio"
                    name="provider"
                    checked={calendarProvider === "microsoft"}
                    onChange={() => setCalendarProvider("microsoft")}
                    disabled={!calendarStatus.microsoft.syncReady}
                    className="mr-2"
                  />
                  Outlook Calendar {calendarStatus.microsoft.connected ? `(${calendarStatus.microsoft.email || "connected"})` : "(not connected)"}
                </label>
                {!canSyncCalendar && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    No calendar integration is connected. The interview will be saved in HireMe only.{" "}
                    {user?.uid ? (
                      <Link href={`/account/${user.uid}/settings#calendar`} className="font-semibold underline">Open Calendars settings</Link>
                    ) : null}
                  </p>
                )}
              </div>
            )}
            <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
              {scheduledAtIso ? `Interview for ${new Date(scheduledAtIso).toLocaleString()} (${timezone}) • Provider: ${selectedProviderLabel}` : "Select date and time to continue."}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <p className="text-xs text-slate-500">
            Saving always updates HireMe. Calendar sync uses the selected connected provider.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">Cancel</button>
            <button type="button" onClick={onSubmit} disabled={busy || !scheduledAtIso} className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? "Saving..." : primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
