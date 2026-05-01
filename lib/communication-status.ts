import { waitingOnLabel } from "@/lib/hiring-decision";

export type SequenceStatusInput = {
  status?: string | null;
  nextStepAt?: unknown;
  currentStepIndex?: number;
  steps?: unknown[] | null;
};

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const v = value as { toDate?: () => Date; _seconds?: number };
  if (typeof v.toDate === "function") return v.toDate();
  if (typeof v._seconds === "number") return new Date(v._seconds * 1000);
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function isFollowUpOverdue(nextFollowUpAt: unknown, now: Date): boolean {
  const d = toDate(nextFollowUpAt);
  if (!d) return false;
  return d.getTime() < now.getTime();
}

function isFollowUpDueSoon(nextFollowUpAt: unknown, now: Date): boolean {
  const d = toDate(nextFollowUpAt);
  if (!d) return false;
  const ms = d.getTime() - now.getTime();
  return ms >= 0 && ms <= 24 * 60 * 60 * 1000;
}

function isInterviewUpcoming(interviewAt: unknown, now: Date): boolean {
  const d = toDate(interviewAt);
  if (!d) return false;
  return d.getTime() >= now.getTime();
}

export function isSequenceStepDue(sequence: SequenceStatusInput | null | undefined, now: Date): boolean {
  if (!sequence || String(sequence.status || "").toUpperCase() !== "ACTIVE") return false;
  const next = toDate(sequence.nextStepAt);
  if (!next) return false;
  return next.getTime() <= now.getTime();
}

export type CommunicationStatusInput = {
  pipelineStage?: string | null;
  hasEvaluation?: boolean;
  isEvaluationComplete?: boolean;
  reviewStatus?: string | null;
  /** When known: true = last message from recruiter (waiting on candidate). */
  awaitingCandidateReply?: boolean | null;
  nextFollowUpAt?: unknown;
  interviewAt?: unknown;
  sequence?: SequenceStatusInput | null;
  now?: Date;
};

/**
 * Single source for recruiter-facing workflow sentence (evaluation / review / outreach).
 */
export function getCommunicationWorkflowLine(input: CommunicationStatusInput): string {
  const awaiting =
    input.awaitingCandidateReply === true
      ? true
      : input.awaitingCandidateReply === false
        ? false
        : undefined;
  return waitingOnLabel({
    pipelineStage: input.pipelineStage,
    hasEvaluation: !!input.hasEvaluation,
    isEvaluationComplete: !!input.isEvaluationComplete,
    reviewStatus: input.reviewStatus,
    awaitingCandidateReply: awaiting === true ? true : undefined,
  });
}

/**
 * Short operational chips (reply state, timing, sequence, interview) — avoid duplicating the workflow line.
 */
export function getCommunicationOperationalChips(input: CommunicationStatusInput): string[] {
  const now = input.now || new Date();
  const chips: string[] = [];
  const workflow = getCommunicationWorkflowLine(input).toLowerCase();

  if (input.awaitingCandidateReply === true) {
    if (!workflow.includes("candidate reply")) chips.push("Awaiting candidate");
  } else if (input.awaitingCandidateReply === false) {
    chips.push("Awaiting recruiter");
  }

  const fuOver = isFollowUpOverdue(input.nextFollowUpAt, now);
  const fuSoon = isFollowUpDueSoon(input.nextFollowUpAt, now);
  if (fuOver) chips.push("Overdue");
  else if (fuSoon) chips.push("Follow-up due");

  if (isInterviewUpcoming(input.interviewAt, now)) chips.push("Interview scheduled");

  const seq = input.sequence;
  if (seq && String(seq.status || "").toUpperCase() === "ACTIVE") {
    chips.push("Sequence active");
    if (isSequenceStepDue(seq, now)) chips.push("Sequence step due");
  }

  if (String(input.reviewStatus || "") === "REQUESTED" && !workflow.includes("hiring manager")) {
    chips.push("Review requested");
  }

  const stage = String(input.pipelineStage || "").toUpperCase();
  const evalIncompletePartial =
    !input.isEvaluationComplete &&
    (stage === "INTERVIEW" || stage === "FINALIST" || stage === "OFFER") &&
    !!input.hasEvaluation;

  if (evalIncompletePartial && !workflow.includes("evaluation")) {
    chips.push("Evaluation incomplete");
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of chips) {
    const k = c.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

/** Pipeline / compare single-line attention: workflow + non-overlapping chips. */
export function formatRecruiterAttentionLine(input: CommunicationStatusInput): string {
  const workflow = getCommunicationWorkflowLine(input);
  const chips = getCommunicationOperationalChips(input);
  const extra = chips.filter((c) => !workflow.toLowerCase().includes(c.toLowerCase()));
  return extra.length ? `${workflow} · ${extra.join(" · ")}` : workflow;
}

/** Inbox / thread header: workflow + chips as one flat list for compact display. */
export function getCommunicationStatusDisplayLabels(input: CommunicationStatusInput): string[] {
  const workflow = getCommunicationWorkflowLine(input);
  const chips = getCommunicationOperationalChips(input);
  const merged = [workflow, ...chips.filter((c) => !workflow.toLowerCase().includes(c.toLowerCase()))];
  const seen = new Set<string>();
  return merged.filter((x) => {
    const t = x.trim();
    if (!t || seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}

export function getRecruiterNextStep(input: CommunicationStatusInput): string {
  const stage = String(input.pipelineStage || "NEW").toUpperCase();
  const awaitingCandidate = input.awaitingCandidateReply === true;
  const interviewSoon = isInterviewUpcoming(input.interviewAt, input.now || new Date());

  if (stage === "NEW") return "Next step: Message candidate";
  if (stage === "SHORTLIST") return "Next step: Reach out and qualify";
  if (stage === "CONTACTED" && awaitingCandidate) return "Next step: Follow up";
  if (stage === "CONTACTED" && input.awaitingCandidateReply === false) return "Next step: Respond";
  if (stage === "INTERVIEW" || interviewSoon) {
    if (!input.isEvaluationComplete) return "Next step: Complete scorecard";
    return "Next step: Request manager review";
  }
  if (stage === "FINALIST") return "Next step: Final decision";
  if (stage === "OFFER") return "Next step: Close offer with candidate";
  if (stage === "HIRED") return "Next step: Onboarding / close job if done";
  if (String(input.reviewStatus || "") === "REQUESTED") return "Next step: Wait for manager review";
  return "Next step: Review candidate";
}
