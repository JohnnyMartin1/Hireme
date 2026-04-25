import type { PipelineStage } from "@/lib/firebase-firestore";
import {
  getCommunicationOperationalChips,
  isSequenceStepDue,
  type SequenceStatusInput,
} from "@/lib/communication-status";

export const TEMPLATE_TYPES = [
  "OUTREACH",
  "FOLLOW_UP",
  "INTERVIEW",
  "REJECTION",
  "CUSTOM",
] as const;

export type MessageTemplateType = (typeof TEMPLATE_TYPES)[number];

export type MessageTemplate = {
  id: string;
  ownerUserId?: string;
  companyId?: string | null;
  name: string;
  type: MessageTemplateType;
  stage?: PipelineStage | null;
  subject?: string;
  body: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export const SEQUENCE_STATUSES = ["ACTIVE", "COMPLETED", "STOPPED"] as const;
export type SequenceStatus = (typeof SEQUENCE_STATUSES)[number];

export type OutreachSequenceStep = {
  delayDays: number;
  messageTemplateId?: string | null;
  body?: string | null;
};

export type OutreachSequence = {
  id: string;
  jobId?: string | null;
  candidateId: string;
  status: SequenceStatus;
  steps: OutreachSequenceStep[];
  currentStepIndex: number;
  nextStepAt?: unknown;
  lastTriggeredAt?: unknown;
  stoppedReason?: string | null;
  createdByUserId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type InterviewEvent = {
  id: string;
  companyId?: string;
  jobId: string;
  candidateId: string;
  type?: "PHONE_SCREEN" | "VIDEO" | "ONSITE" | "FINAL_ROUND" | "CUSTOM";
  title?: string;
  description?: string;
  interviewerIds?: string[];
  organizerUserId?: string;
  scheduledAt: unknown;
  durationMinutes: number;
  timezone?: string;
  location?: {
    type: "VIDEO" | "PHONE" | "IN_PERSON";
    value: string;
  } | string;
  candidateResponse?: "PENDING" | "ACCEPTED" | "DECLINED" | "REQUEST_RESCHEDULE";
  notes?: string;
  status: "PROPOSED" | "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "RESCHEDULE_REQUESTED";
  calendarProvider?: "google";
  calendarEventId?: string;
  calendarHtmlLink?: string;
  calendarSyncStatus?: "NOT_SYNCED" | "SYNCED" | "FAILED";
  calendarSyncError?: string | null;
  calendarSyncedAt?: unknown;
  createdBy: string;
  completedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export const INTERVIEW_TYPE_OPTIONS = [
  "PHONE_SCREEN",
  "VIDEO",
  "ONSITE",
  "FINAL_ROUND",
  "CUSTOM",
] as const;

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const v = value as { toDate?: () => Date; _seconds?: number };
  if (typeof v.toDate === "function") return v.toDate();
  if (typeof v._seconds === "number") return new Date(v._seconds * 1000);
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function addDays(base: Date, days: number): Date {
  const copy = new Date(base.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function getSuggestedTemplateType(stage: PipelineStage): MessageTemplateType {
  if (stage === "NEW") return "OUTREACH";
  if (stage === "SHORTLIST") return "OUTREACH";
  if (stage === "CONTACTED") return "FOLLOW_UP";
  if (stage === "RESPONDED") return "FOLLOW_UP";
  if (stage === "INTERVIEW" || stage === "FINALIST") return "INTERVIEW";
  if (stage === "REJECTED") return "REJECTION";
  return "CUSTOM";
}

/** Shown in UI so recruiters do not expect auto-send. */
export const SEQUENCE_ASSISTANT_MODE_LABEL = "Reminder-assisted sequence";

export function describeSequenceAssistantState(
  sequence: OutreachSequence | null | undefined,
  now: Date = new Date()
): string {
  if (!sequence) {
    return "No active sequence. Steps are reminders only — HireMe does not auto-send messages. You send each follow-up yourself.";
  }
  const st = String(sequence.status || "").toUpperCase();
  if (st === "STOPPED") {
    const reason = sequence.stoppedReason ? ` (${String(sequence.stoppedReason).replace(/_/g, " ").toLowerCase()})` : "";
    return `Sequence stopped${reason}.`;
  }
  if (st === "COMPLETED") return "Sequence completed.";
  if (st !== "ACTIVE") return "No active sequence.";
  const next = toDate(sequence.nextStepAt);
  const due = isSequenceStepDue(sequence as SequenceStatusInput, now);
  if (due) {
    return "Next sequence step is due — open this thread or candidate profile to send the follow-up. Messages are not sent automatically.";
  }
  if (next && next.getTime() > now.getTime()) {
    return `Sequence active — next reminder ${next.toLocaleString()}. You will send the message when ready.`;
  }
  return "Sequence active — use templates or your draft to send the next step when you are ready.";
}

/** @deprecated Prefer getCommunicationOperationalChips from @/lib/communication-status */
export function getThreadOperationalLabels(input: {
  isAwaitingCandidate: boolean;
  nextFollowUpAt?: unknown;
  interviewAt?: unknown;
  now?: Date;
  sequence?: SequenceStatusInput | null;
}): string[] {
  return getCommunicationOperationalChips({
    awaitingCandidateReply: input.isAwaitingCandidate,
    nextFollowUpAt: input.nextFollowUpAt,
    interviewAt: input.interviewAt,
    sequence: input.sequence ?? null,
    now: input.now,
  });
}

export function formatTemplatePreview(template: MessageTemplate): string {
  const subject = String(template.subject || "").trim();
  if (!subject) return template.body;
  return `Subject: ${subject}\n\n${template.body}`;
}
