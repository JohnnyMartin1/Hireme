"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useToast } from "@/components/NotificationSystem";
import { fetchCompanyTeamMembers } from "@/lib/collaboration-client";
import { fetchJobInterviewPlan, patchJobInterviewById, upsertJobInterview } from "@/lib/communication-client";
import type { InterviewEvent, InterviewPlanRound, ScorecardTemplate } from "@/lib/communication-workflow";

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
  const [planLoading, setPlanLoading] = useState(false);
  const [planRounds, setPlanRounds] = useState<InterviewPlanRound[]>([]);
  const [scorecardTemplates, setScorecardTemplates] = useState<ScorecardTemplate[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [selectedScorecardTemplateId, setSelectedScorecardTemplateId] = useState<string>("");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [durationTouched, setDurationTouched] = useState(false);
  const [interviewersTouched, setInterviewersTouched] = useState(false);
  const [scorecardTouched, setScorecardTouched] = useState(false);
  const lastAutofilledRoundRef = useRef<string>("");

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

      setPlanLoading(true);
      const planRes = await fetchJobInterviewPlan(jobId, token);
      if (planRes.ok) {
        const rounds = (planRes.data.rounds || []).filter((r: any) => r?.active !== false) as InterviewPlanRound[];
        const templates = planRes.data.scorecardTemplates || [];
        setPlanRounds(rounds);
        setScorecardTemplates(templates);
        setSelectedPlanId(String(planRes.data.plan?.id || ""));
      } else {
        setPlanRounds([]);
        setScorecardTemplates([]);
      }
      setPlanLoading(false);
    };
    load();
  }, [isOpen, user, jobId]);

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
      setSelectedRoundId("");
      setSelectedScorecardTemplateId("");
      setTitleTouched(false);
      setDurationTouched(false);
      setInterviewersTouched(false);
      setScorecardTouched(false);
      lastAutofilledRoundRef.current = "";
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
    setSelectedRoundId(String(iv?.roundId || ""));
    setSelectedScorecardTemplateId(String(iv?.scorecardTemplateId || ""));
    setSelectedPlanId(String(iv?.planId || ""));
    setTitleTouched(true);
    setDurationTouched(true);
    setInterviewersTouched(true);
    setScorecardTouched(true);
    lastAutofilledRoundRef.current = String(iv?.roundId || "");
  }, [isOpen, existingInterview, defaultStatus]);

  useEffect(() => {
    if (!selectedRoundId) return;
    const chosenRound = planRounds.find((r) => r.id === selectedRoundId);
    if (!chosenRound) return;
    const roundChanged = lastAutofilledRoundRef.current && lastAutofilledRoundRef.current !== selectedRoundId;
    const allowOverwriteTouched = roundChanged
      ? window.confirm("Apply this round's defaults to fields you already edited?")
      : false;
    if (!titleTouched || allowOverwriteTouched) {
      setTitle(String(chosenRound.roundName || TITLE_BY_TYPE[type] || "Interview"));
    }
    if (!durationTouched || allowOverwriteTouched) {
      setDurationMinutes(String(chosenRound.defaultDurationMinutes || 30));
    }
    if ((!interviewersTouched || allowOverwriteTouched) && Array.isArray(chosenRound.defaultInterviewerIds)) {
      setInterviewerIds(chosenRound.defaultInterviewerIds.map((id) => String(id)));
    }
    const firstTemplate = scorecardTemplates.find((tpl) => String(tpl.roundId || "") === selectedRoundId);
    if (firstTemplate && (!scorecardTouched || allowOverwriteTouched)) setSelectedScorecardTemplateId(firstTemplate.id);
    lastAutofilledRoundRef.current = selectedRoundId;
  }, [selectedRoundId, planRounds, scorecardTemplates, titleTouched, durationTouched, interviewersTouched, scorecardTouched, type]);

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
        planId: selectedPlanId || null,
        roundId: selectedRoundId || null,
        scorecardTemplateId: selectedScorecardTemplateId || null,
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
        toast.warning(
          existingInterview?.id ? "Interview updated" : "Interview scheduled",
          "Calendar sync failed. The interview was saved in HireMe."
        );
      } else if (syncStatus === "SYNCED") {
        const label = String(saved?.calendarProvider || "").toLowerCase() === "microsoft" ? "Outlook Calendar" : "Google Calendar";
        toast.success(
          existingInterview?.id ? "Interview updated" : "Interview scheduled",
          `Synced to ${label}.`
        );
      } else {
        toast.success(
          existingInterview?.id ? "Interview updated" : "Interview scheduled",
          existingInterview?.id ? "Changes saved in HireMe." : "Saved in HireMe."
        );
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
          <h3 className="text-xl font-bold text-navy-900">
            {existingInterview?.id ? "Reschedule interview" : "Schedule interview"}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-semibold text-navy-900">{candidateName || "Candidate"}</span>
            {jobTitle ? (
              <>
                {" "}
                <span className="text-slate-400">·</span> {jobTitle}
              </>
            ) : null}
          </p>
          {!calendarStatus.loading ? (
            <p className="mt-2 text-xs text-slate-600">
              {calendarStatus.google.connected ? (
                <span className="mr-2 inline-block rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-900">
                  Google connected{calendarStatus.google.email ? ` (${calendarStatus.google.email})` : ""}
                </span>
              ) : (
                <span className="mr-2 text-slate-500">Google not connected</span>
              )}
              {calendarStatus.microsoft.connected ? (
                <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-900">
                  Outlook connected{calendarStatus.microsoft.email ? ` (${calendarStatus.microsoft.email})` : ""}
                </span>
              ) : (
                <span className="text-slate-500">Outlook not connected</span>
              )}
            </p>
          ) : null}
        </div>

        <div className="space-y-5 px-6 py-5">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interview details</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-600">Interview round</label>
            <select
              value={selectedRoundId}
              onChange={(e) => setSelectedRoundId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Manual interview (no round)</option>
              {planRounds.map((round) => (
                <option key={round.id} value={round.id}>
                  {round.roundName}
                </option>
              ))}
            </select>
            {planLoading ? (
              <p className="mt-1 text-[11px] text-slate-500">Loading interview plan...</p>
            ) : planRounds.length === 0 ? (
              <p className="mt-1 text-[11px] text-amber-700">
                No interview plan yet. You can still schedule manually, or create a plan from job interviews.
              </p>
            ) : null}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Interview type</label>
            <select value={type} onChange={(e) => { setType(e.target.value); if (!title.trim() || !titleTouched) setTitle(TITLE_BY_TYPE[e.target.value]); }} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Title</label>
            <input value={title} onChange={(e) => { setTitle(e.target.value); setTitleTouched(true); }} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Duration</label>
            <select value={durationMinutes} onChange={(e) => { setDurationMinutes(e.target.value); setDurationTouched(true); }} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
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
                    onChange={() => {
                      setInterviewersTouched(true);
                      setInterviewerIds((prev) => (prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id]));
                    }}
                  />
                  <span className="text-slate-700">{m.name}</span>
                </label>
              ))}
            </div>
            {interviewerIds.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {interviewerIds.map((id) => {
                  const m = teamMembers.find((x) => x.id === id);
                  return <button key={id} type="button" onClick={() => { setInterviewersTouched(true); setInterviewerIds((prev) => prev.filter((x) => x !== id)); }} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px]">{m?.name || id} ×</button>;
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
            <label className="text-xs font-semibold text-slate-600">Scorecard template</label>
            <select
              value={selectedScorecardTemplateId}
              onChange={(e) => { setSelectedScorecardTemplateId(e.target.value); setScorecardTouched(true); }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">No scorecard template</option>
              {scorecardTemplates
                .filter((tpl) => !selectedRoundId || String(tpl.roundId || "") === selectedRoundId)
                .map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title}
                  </option>
                ))}
            </select>
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
              {scheduledDate && scheduledTime
                ? `${scheduledDate} at ${scheduledTime} (${timezone}) · Calendar: ${selectedProviderLabel}`
                : "Select date and time to continue."}
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
