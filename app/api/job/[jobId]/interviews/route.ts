import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canUserAccessJob } from "@/lib/matching/job-access";
import admin from "firebase-admin";
import {
  createGoogleCalendarInterviewEvent,
  getGoogleCalendarIntegration,
  updateGoogleCalendarInterviewEvent,
  cancelGoogleCalendarInterviewEvent,
} from "@/lib/integrations/google-calendar";

export const dynamic = "force-dynamic";

const INTERVIEW_STATUSES = [
  "PROPOSED",
  "SCHEDULED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "RESCHEDULE_REQUESTED",
] as const;
const INTERVIEW_TYPES = ["PHONE_SCREEN", "VIDEO", "ONSITE", "FINAL_ROUND", "CUSTOM"] as const;
const LOCATION_TYPES = ["VIDEO", "PHONE", "IN_PERSON"] as const;
const CANDIDATE_RESPONSES = ["PENDING", "ACCEPTED", "DECLINED", "REQUEST_RESCHEDULE"] as const;

type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];
type InterviewType = (typeof INTERVIEW_TYPES)[number];

function normalizeStatus(value: unknown): InterviewStatus {
  const raw = String(value || "").toUpperCase().trim();
  if ((INTERVIEW_STATUSES as readonly string[]).includes(raw)) return raw as InterviewStatus;
  return "PROPOSED";
}

function normalizeType(value: unknown): InterviewType {
  const raw = String(value || "").toUpperCase().trim();
  if ((INTERVIEW_TYPES as readonly string[]).includes(raw)) return raw as InterviewType;
  return "VIDEO";
}

function toDateInput(value: unknown): Date | null {
  if (!value) return null;
  const v = value as { toDate?: () => Date };
  if (typeof v.toDate === "function") return v.toDate();
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

async function resolveAttendees(input: {
  candidateId: string;
  interviewerIds: string[];
}): Promise<Array<{ email: string }>> {
  const ids = Array.from(new Set([input.candidateId, ...input.interviewerIds]));
  if (ids.length === 0) return [];
  const snaps = await Promise.all(ids.map((id) => adminDb.collection("users").doc(id).get()));
  return snaps
    .map((snap) => String((snap.data() as any)?.email || "").trim())
    .filter(Boolean)
    .map((email) => ({ email }));
}

async function authorizeJobAccess(request: NextRequest, jobId: string) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const decoded = await adminAuth.verifyIdToken(token);
  const jobSnap = await adminDb.collection("jobs").doc(jobId).get();
  if (!jobSnap.exists) {
    return { error: NextResponse.json({ error: "Job not found" }, { status: 404 }) };
  }
  const jobData = jobSnap.data() as Record<string, unknown>;
  const ok = await canUserAccessJob(adminDb, jobData, decoded.uid);
  if (!ok) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { decoded, jobData };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    if (!jobId) return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;
    const candidateId = request.nextUrl.searchParams.get("candidateId");
    let q = adminDb.collection("interviewEvents").where("jobId", "==", jobId);
    if (candidateId) q = q.where("candidateId", "==", candidateId);
    const snap = await q.get();
    const interviews = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => {
        const aDate = a?.scheduledAt?.toDate ? a.scheduledAt.toDate() : a?.scheduledAt || null;
        const bDate = b?.scheduledAt?.toDate ? b.scheduledAt.toDate() : b?.scheduledAt || null;
        return new Date(aDate || 0).getTime() - new Date(bDate || 0).getTime();
      });
    return NextResponse.json({ interviews });
  } catch (error) {
    console.error("GET /api/job/[jobId]/interviews", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    if (!jobId) return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const candidateId = String(body?.candidateId || "");
    const scheduledAt = body?.scheduledAt ? new Date(String(body.scheduledAt)) : null;
    const durationMinutes = Math.max(15, Number(body?.durationMinutes || 30));
    const interviewType = normalizeType(body?.type);
    const titleDefaultMap: Record<InterviewType, string> = {
      PHONE_SCREEN: "Initial Phone Screen",
      VIDEO: "Video Interview",
      ONSITE: "Onsite Interview",
      FINAL_ROUND: "Final Round Interview",
      CUSTOM: "Interview",
    };
    const title = String(body?.title || titleDefaultMap[interviewType]).trim();
    const description = body?.description ? String(body.description).trim() : null;
    const interviewerIdsRaw = Array.isArray(body?.interviewerIds) ? body.interviewerIds : [];
    const interviewerIds: string[] = Array.from(
      new Set(interviewerIdsRaw.map((id: unknown) => String(id)).filter((v: string): v is string => Boolean(v)))
    );
    const timezone = String(body?.timezone || "UTC");
    const locationTypeRaw = String((body as any)?.location?.type || "").toUpperCase();
    const locationType = (LOCATION_TYPES as readonly string[]).includes(locationTypeRaw) ? locationTypeRaw : "VIDEO";
    const locationValue = String((body as any)?.location?.value || body?.location || "").trim();
    const notes = String(body?.notes || "").trim();
    const status = normalizeStatus(body?.status);
    const candidateResponseRaw = String(body?.candidateResponse || "PENDING").toUpperCase().trim();
    const candidateResponse = (CANDIDATE_RESPONSES as readonly string[]).includes(candidateResponseRaw)
      ? candidateResponseRaw
      : "PENDING";
    if (!candidateId) return NextResponse.json({ error: "Missing candidateId" }, { status: 400 });
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Valid scheduledAt is required" }, { status: 400 });
    }
    const companyId = String((auth.jobData as any)?.companyId || "");
    if (!companyId) return NextResponse.json({ error: "Job is missing company context" }, { status: 400 });

    const candidateSnap = await adminDb.collection("users").doc(candidateId).get();
    if (!candidateSnap.exists) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    if (interviewerIds.length > 0) {
      const interviewerSnaps = await Promise.all(interviewerIds.map((id) => adminDb.collection("users").doc(id).get()));
      const invalid = interviewerSnaps.find((s) => !s.exists || String((s.data() as any)?.companyId || "") !== companyId);
      if (invalid) {
        return NextResponse.json({ error: "All interviewers must be teammates in this company" }, { status: 400 });
      }
    }

    const ref = adminDb.collection("interviewEvents").doc();
    await ref.set({
      companyId,
      jobId,
      candidateId,
      type: interviewType,
      title,
      description,
      interviewerIds,
      organizerUserId: auth.decoded!.uid,
      status,
      scheduledAt,
      durationMinutes,
      timezone,
      location: { type: locationType, value: locationValue },
      candidateResponse,
      notes,
      calendarSyncStatus: "NOT_SYNCED",
      calendarSyncError: null,
      createdBy: auth.decoded!.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: status === "COMPLETED" ? admin.firestore.FieldValue.serverTimestamp() : null,
    });
    try {
      const organizerIntegration = await getGoogleCalendarIntegration(auth.decoded!.uid);
      if (organizerIntegration && organizerIntegration.status === "CONNECTED" && organizerIntegration.refreshToken) {
        const attendees = await resolveAttendees({ candidateId, interviewerIds });
        const event = await createGoogleCalendarInterviewEvent({
          organizerUserId: auth.decoded!.uid,
          title,
          description,
          scheduledAtIso: scheduledAt.toISOString(),
          durationMinutes,
          timezone,
          location: locationValue,
          attendees,
        });
        await ref.set(
          {
            calendarProvider: "google",
            calendarEventId: event.id || null,
            calendarHtmlLink: event.htmlLink || null,
            calendarSyncStatus: "SYNCED",
            calendarSyncError: null,
            calendarSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (syncError) {
      await ref.set(
        {
          calendarSyncStatus: "FAILED",
          calendarSyncError: syncError instanceof Error ? syncError.message : "Google Calendar sync failed",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
    const fresh = await ref.get();
    return NextResponse.json({ interview: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("POST /api/job/[jobId]/interviews", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const jobId = params.jobId;
    if (!jobId) return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const interviewId = String(body?.interviewId || "");
    const candidateId = String(body?.candidateId || "");
    let ref;
    if (interviewId) ref = adminDb.collection("interviewEvents").doc(interviewId);
    else if (candidateId) {
      const snapByCandidate = await adminDb
        .collection("interviewEvents")
        .where("jobId", "==", jobId)
        .where("candidateId", "==", candidateId)
        .get();
      if (snapByCandidate.empty) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
      ref = adminDb.collection("interviewEvents").doc(snapByCandidate.docs[0].id);
    } else {
      return NextResponse.json({ error: "interviewId or candidateId is required" }, { status: 400 });
    }
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    const existing = snap.data() as Record<string, unknown>;
    const updates: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (body?.scheduledAt !== undefined) {
      updates.scheduledAt = body.scheduledAt ? new Date(String(body.scheduledAt)) : null;
    }
    if (body?.durationMinutes !== undefined) {
      updates.durationMinutes = Math.max(15, Number(body.durationMinutes || 30));
    }
    if (body?.location !== undefined) {
      const locationTypeRaw = String((body as any)?.location?.type || "").toUpperCase();
      const locationType = (LOCATION_TYPES as readonly string[]).includes(locationTypeRaw) ? locationTypeRaw : "VIDEO";
      updates.location = {
        type: locationType,
        value: String((body as any)?.location?.value || body.location || "").trim(),
      };
    }
    if (body?.type !== undefined) updates.type = normalizeType(body.type);
    if (body?.title !== undefined) updates.title = String(body.title || "").trim();
    if (body?.description !== undefined) updates.description = String(body.description || "").trim();
    if (body?.interviewerIds !== undefined && Array.isArray(body.interviewerIds)) {
      const nextIds = body.interviewerIds.map((id: unknown) => String(id)).filter(Boolean);
      const companyId = String((auth.jobData as any)?.companyId || "");
      if (nextIds.length > 0 && companyId) {
        const interviewerSnaps = await Promise.all(nextIds.map((id: string) => adminDb.collection("users").doc(id).get()));
        const invalid = interviewerSnaps.find((s) => !s.exists || String((s.data() as any)?.companyId || "") !== companyId);
        if (invalid) {
          return NextResponse.json({ error: "All interviewers must be teammates in this company" }, { status: 400 });
        }
      }
      updates.interviewerIds = nextIds;
    }
    if (body?.timezone !== undefined) updates.timezone = String(body.timezone || "UTC");
    if (body?.notes !== undefined) updates.notes = String(body.notes || "").trim();
    if (body?.status !== undefined) updates.status = normalizeStatus(body.status);
    if (body?.candidateResponse !== undefined) {
      const raw = String(body.candidateResponse || "").toUpperCase().trim();
      updates.candidateResponse = (CANDIDATE_RESPONSES as readonly string[]).includes(raw) ? raw : "PENDING";
    }
    if (String(updates.status || "").toUpperCase() === "COMPLETED") {
      updates.completedAt = admin.firestore.FieldValue.serverTimestamp();
    }
    await ref.set(updates, { merge: true });
    try {
      const organizerUserId = String(existing?.organizerUserId || existing?.createdBy || "");
      const calendarEventId = String(existing?.calendarEventId || "");
      const status = String((updates.status ?? existing?.status) || "").toUpperCase();
      const organizerIntegration = organizerUserId ? await getGoogleCalendarIntegration(organizerUserId) : null;
      const canSyncWithGoogle = Boolean(
        organizerUserId &&
          organizerIntegration &&
          organizerIntegration.status === "CONNECTED" &&
          organizerIntegration.refreshToken
      );

      if (canSyncWithGoogle) {
        if (status === "CANCELLED") {
          if (calendarEventId) {
            await cancelGoogleCalendarInterviewEvent({ organizerUserId, eventId: calendarEventId });
          }
          await ref.set(
            {
              calendarSyncStatus: "SYNCED",
              calendarSyncError: null,
              calendarSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        } else {
          const scheduledAt = toDateInput(updates.scheduledAt ?? existing?.scheduledAt);
          const durationMinutes = Math.max(15, Number((updates.durationMinutes ?? existing?.durationMinutes) || 30));
          const title = String((updates.title ?? existing?.title) || "Interview");
          const description = String((updates.description ?? existing?.description) || "");
          const timezone = String((updates.timezone ?? existing?.timezone) || "UTC");
          const locationObj = (updates.location ?? existing?.location) as any;
          const locationValue = String(locationObj?.value || locationObj || "");
          const candidateId = String(existing?.candidateId || "");
          const interviewerIds = Array.isArray(updates.interviewerIds)
            ? (updates.interviewerIds as string[])
            : Array.isArray(existing?.interviewerIds)
              ? (existing.interviewerIds as string[])
              : [];
          if (scheduledAt) {
            const attendees = await resolveAttendees({ candidateId, interviewerIds });
            const event = calendarEventId
              ? await updateGoogleCalendarInterviewEvent({
                  organizerUserId,
                  eventId: calendarEventId,
                  title,
                  description,
                  scheduledAtIso: scheduledAt.toISOString(),
                  durationMinutes,
                  timezone,
                  location: locationValue,
                  attendees,
                })
              : await createGoogleCalendarInterviewEvent({
                  organizerUserId,
                  title,
                  description,
                  scheduledAtIso: scheduledAt.toISOString(),
                  durationMinutes,
                  timezone,
                  location: locationValue,
                  attendees,
                });

            await ref.set(
              {
                calendarProvider: "google",
                calendarEventId: event.id || existing?.calendarEventId || null,
                calendarHtmlLink: event.htmlLink || existing?.calendarHtmlLink || null,
                calendarSyncStatus: "SYNCED",
                calendarSyncError: null,
                calendarSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          }
        }
      }
    } catch (syncError) {
      await ref.set(
        {
          calendarSyncStatus: "FAILED",
          calendarSyncError: syncError instanceof Error ? syncError.message : "Google Calendar sync failed",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
    const fresh = await ref.get();
    return NextResponse.json({ interview: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("PATCH /api/job/[jobId]/interviews", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
