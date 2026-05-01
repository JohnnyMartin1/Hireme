import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canUserAccessJob } from "@/lib/matching/job-access";

export const INTERVIEW_PLAN_STATUSES = ["ACTIVE", "DRAFT", "ARCHIVED"] as const;
export const INTERVIEW_ROUND_TYPES = [
  "PHONE_SCREEN",
  "TECHNICAL",
  "BEHAVIORAL",
  "PORTFOLIO_REVIEW",
  "CASE_STUDY",
  "HIRING_MANAGER",
  "FINAL_ROUND",
  "CUSTOM",
] as const;
export const SCORECARD_RATING_SCALES = ["YES_NO", "ONE_TO_FIVE", "ONE_TO_FOUR", "TEXT"] as const;
export const FEEDBACK_STATUSES = ["REQUESTED", "IN_PROGRESS", "SUBMITTED", "WAIVED"] as const;
export const FEEDBACK_RECOMMENDATIONS = ["STRONG_YES", "YES", "MIXED", "NO", "HOLD"] as const;
export const DEBRIEF_STATUSES = ["NOT_STARTED", "READY", "IN_PROGRESS", "COMPLETED"] as const;
export const DEBRIEF_DECISIONS = ["ADVANCE", "REJECT", "FINALIST", "HOLD", "NEEDS_MORE_SIGNAL"] as const;

type AuthorizedJobContext = {
  userId: string;
  role: string;
  companyId: string;
  jobId: string;
  jobData: Record<string, unknown>;
};

export function normalizeEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number]
): T[number] {
  const raw = String(value || "").toUpperCase().trim();
  if ((allowed as readonly string[]).includes(raw)) return raw as T[number];
  return fallback;
}

export function normalizeOptionalString(value: unknown): string | null {
  const parsed = String(value || "").trim();
  return parsed ? parsed : null;
}

export function planDocId(jobId: string): string {
  return `job_${jobId}`;
}

export function feedbackDocId(interviewEventId: string, interviewerUserId: string): string {
  return `iv_${interviewEventId}__user_${interviewerUserId}`;
}

export async function authorizeJobRequest(
  request: NextRequest,
  jobId: string
): Promise<{ context?: AuthorizedJobContext; error?: NextResponse }> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const decoded = await adminAuth.verifyIdToken(token);
  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  const userData = (userSnap.data() || {}) as Record<string, unknown>;
  const role = String(userData.role || "").toUpperCase();
  const companyId = String(userData.companyId || "");
  if (!companyId) {
    return { error: NextResponse.json({ error: "User missing company context" }, { status: 403 }) };
  }
  const jobSnap = await adminDb.collection("jobs").doc(jobId).get();
  if (!jobSnap.exists) {
    return { error: NextResponse.json({ error: "Job not found" }, { status: 404 }) };
  }
  const jobData = (jobSnap.data() || {}) as Record<string, unknown>;
  const canAccess = await canUserAccessJob(adminDb, jobData, decoded.uid);
  if (!canAccess) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const jobCompanyId = String(jobData.companyId || "");
  if (jobCompanyId && jobCompanyId !== companyId) {
    return { error: NextResponse.json({ error: "Forbidden company context" }, { status: 403 }) };
  }
  return { context: { userId: decoded.uid, role, companyId: jobCompanyId || companyId, jobId, jobData } };
}

export async function assertCandidateInCompany(candidateId: string, companyId: string): Promise<boolean> {
  if (!candidateId || !companyId) return false;
  const snap = await adminDb.collection("users").doc(candidateId).get();
  if (!snap.exists) return false;
  const data = (snap.data() || {}) as Record<string, unknown>;
  return String(data.companyId || "") === companyId || String(data.role || "").toUpperCase() === "JOB_SEEKER";
}

export async function assertInterviewBelongsToJob(
  interviewEventId: string,
  jobId: string,
  candidateId?: string
): Promise<{ ok: boolean; interview?: Record<string, unknown> }> {
  const snap = await adminDb.collection("interviewEvents").doc(interviewEventId).get();
  if (!snap.exists) return { ok: false };
  const data = (snap.data() || {}) as Record<string, unknown>;
  if (String(data.jobId || "") !== jobId) return { ok: false };
  if (candidateId && String(data.candidateId || "") !== candidateId) return { ok: false };
  return { ok: true, interview: { id: snap.id, ...data } };
}

export function nowTs() {
  return admin.firestore.FieldValue.serverTimestamp();
}
