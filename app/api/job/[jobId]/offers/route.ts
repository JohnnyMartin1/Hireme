import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canUserAccessJob } from "@/lib/matching/job-access";
import { canonicalPipelineEntryId } from "@/lib/pipeline-canonical";
import { assertCandidateTiedToJob } from "@/lib/interviews/phase3";
import admin from "firebase-admin";
import {
  COMPENSATION_TYPES,
  normalizeCompensationType,
  normalizeOfferStatus,
  OFFER_APPROVAL_STATUSES,
  type CompensationType,
  type OfferStatus,
} from "@/lib/offers/types";

export const dynamic = "force-dynamic";

async function authorizeOffersRequest(request: NextRequest, jobId: string) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const decoded = await adminAuth.verifyIdToken(token);
  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  const userData = (userSnap.data() || {}) as Record<string, unknown>;
  const role = String(userData.role || "").toUpperCase();
  if (!["EMPLOYER", "RECRUITER", "ADMIN"].includes(role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const jobSnap = await adminDb.collection("jobs").doc(jobId).get();
  if (!jobSnap.exists) {
    return { error: NextResponse.json({ error: "Job not found" }, { status: 404 }) };
  }
  const jobData = (jobSnap.data() || {}) as Record<string, unknown>;
  const ok = await canUserAccessJob(adminDb, jobData, decoded.uid);
  const adminBypass = role === "ADMIN";
  if (!ok && !adminBypass) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { decoded, role, jobData, jobId };
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

const ACTIVE_OFFER_STATUSES: OfferStatus[] = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT"];

function dedupeIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map((x) => String(x || "").trim()).filter(Boolean)));
}

async function validateApproversForJob(jobCompanyId: string, approverIds: string[]) {
  const unique = dedupeIds(approverIds);
  if (!unique.length) return { ok: true as const, validIds: [] as string[] };
  const docs = await Promise.all(unique.map((id) => adminDb.collection("users").doc(id).get()));
  const validIds: string[] = [];
  const invalidIds: string[] = [];
  for (const doc of docs) {
    if (!doc.exists) {
      invalidIds.push(doc.id);
      continue;
    }
    const data = (doc.data() || {}) as Record<string, unknown>;
    const role = String(data.role || "").toUpperCase();
    const companyId = String(data.companyId || "");
    if (!["EMPLOYER", "RECRUITER", "ADMIN"].includes(role)) {
      invalidIds.push(doc.id);
      continue;
    }
    if (role !== "ADMIN" && companyId !== jobCompanyId) {
      invalidIds.push(doc.id);
      continue;
    }
    validIds.push(doc.id);
  }
  if (invalidIds.length) return { ok: false as const, error: `Invalid approver(s): ${invalidIds.join(", ")}` };
  return { ok: true as const, validIds };
}

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const jobId = params.jobId;
    if (!jobId) return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    const auth = await authorizeOffersRequest(request, jobId);
    if (auth.error) return auth.error;

    const candidateIdFilter = request.nextUrl.searchParams.get("candidateId");
    const statusFilter = String(request.nextUrl.searchParams.get("status") || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const limitRaw = Number(request.nextUrl.searchParams.get("limit") || 0);
    const maxItems = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : null;
    const snap = await adminDb.collection("candidateOffers").where("jobId", "==", jobId).get();
    let offers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (candidateIdFilter) {
      offers = offers.filter((o: any) => String(o.candidateId || "") === candidateIdFilter);
    }
    if (statusFilter.length > 0) {
      offers = offers.filter((o: any) => statusFilter.includes(normalizeOfferStatus(o?.status)));
    }
    if (maxItems) {
      offers = offers.slice(0, maxItems);
    }
    const counts: Record<string, number> = {};
    for (const st of ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "ACCEPTED", "DECLINED", "WITHDRAWN"]) {
      counts[st] = 0;
    }
    for (const o of offers as any[]) {
      const s = normalizeOfferStatus(o?.status);
      counts[s] = (counts[s] || 0) + 1;
    }
    return NextResponse.json({ offers, counts });
  } catch (e) {
    console.error("GET /api/job/[jobId]/offers", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const jobId = params.jobId;
    if (!jobId) return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    const auth = await authorizeOffersRequest(request, jobId);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const candidateId = String(body?.candidateId || "").trim();
    if (!candidateId) {
      return NextResponse.json({ error: "Missing candidateId" }, { status: 400 });
    }

    const companyId = String(auth.jobData!.companyId || "");
    if (!companyId) {
      return NextResponse.json({ error: "Job missing companyId" }, { status: 400 });
    }
    const tiedToJob = await assertCandidateTiedToJob(jobId, candidateId);
    if (!tiedToJob) {
      return NextResponse.json({ error: "Candidate is not associated with this job" }, { status: 403 });
    }

    const approvalRequired = Boolean(body?.approvalRequired);
    const initialStatus: OfferStatus = approvalRequired ? "PENDING_APPROVAL" : "DRAFT";
    const approvalStatus = approvalRequired ? "PENDING" : "NOT_REQUIRED";

    const baseSalary = numOrNull(body?.baseSalary);
    const hourlyRate = numOrNull(body?.hourlyRate);
    if (baseSalary !== null && baseSalary < 0) {
      return NextResponse.json({ error: "baseSalary must be non-negative" }, { status: 400 });
    }
    if (hourlyRate !== null && hourlyRate < 0) {
      return NextResponse.json({ error: "hourlyRate must be non-negative" }, { status: 400 });
    }

    const compensationType: CompensationType = normalizeCompensationType(body?.compensationType);
    if (!COMPENSATION_TYPES.includes(compensationType)) {
      return NextResponse.json({ error: "Invalid compensationType" }, { status: 400 });
    }

    const approverValidation = await validateApproversForJob(
      companyId,
      Array.isArray(body?.approverUserIds) ? body.approverUserIds : []
    );
    if (!approverValidation.ok) {
      return NextResponse.json({ error: approverValidation.error }, { status: 400 });
    }
    const approverUserIds = approverValidation.validIds;
    if (approvalRequired && approverUserIds.length === 0) {
      return NextResponse.json({ error: "approvalRequired offers need at least one valid approverUserId" }, { status: 400 });
    }
    if (!OFFER_APPROVAL_STATUSES.includes(approvalStatus)) {
      return NextResponse.json({ error: "Invalid approvalStatus" }, { status: 400 });
    }

    const existingSnap = await adminDb.collection("candidateOffers").where("jobId", "==", jobId).where("candidateId", "==", candidateId).get();
    const existingActive = existingSnap.docs.find((d) => {
      const st = normalizeOfferStatus(d.data()?.status);
      return ACTIVE_OFFER_STATUSES.includes(st);
    });
    if (existingActive) {
      return NextResponse.json(
        {
          error: "An active offer already exists for this candidate. Open the existing offer instead.",
          existingOfferId: existingActive.id,
          offer: { id: existingActive.id, ...existingActive.data() },
        },
        { status: 409 }
      );
    }

    const employerId = String(auth.jobData!.employerId || auth.decoded!.uid);
    const pipelineEntryId = canonicalPipelineEntryId(jobId, candidateId);

    const doc = {
      companyId,
      employerId,
      createdBy: auth.decoded!.uid,
      jobId,
      candidateId,
      pipelineEntryId,
      messageThreadId: strOrNull(body?.messageThreadId),
      debriefId: strOrNull(body?.debriefId),
      status: initialStatus,
      title: String(body?.title || "Offer").trim() || "Offer",
      roleTitle: String(body?.roleTitle || auth.jobData?.title || "Role").trim(),
      compensationType,
      baseSalary,
      bonus: strOrNull(body?.bonus),
      equity: strOrNull(body?.equity),
      hourlyRate,
      currency: String(body?.currency || "USD").trim() || "USD",
      startDate: strOrNull(body?.startDate),
      workLocation: strOrNull(body?.workLocation),
      employmentType: strOrNull(body?.employmentType),
      expirationDate: strOrNull(body?.expirationDate),
      offerNotes: strOrNull(body?.offerNotes),
      internalNotes: strOrNull(body?.internalNotes),
      approvalRequired,
      approverUserIds,
      approvalStatus,
      approvedBy: null,
      approvedAt: null,
      sentAt: null,
      acceptedAt: null,
      declinedAt: null,
      withdrawnAt: null,
      declineReason: null,
      offerLetterUrl: strOrNull(body?.offerLetterUrl),
      offerLetterFileName: strOrNull(body?.offerLetterFileName),
      supersededByOfferId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await adminDb.collection("candidateOffers").add(doc);
    const fresh = await ref.get();

    const entryRef = adminDb.collection("candidatePipelineEntries").doc(pipelineEntryId);
    await entryRef.set(
      {
        currentOfferId: ref.id,
        offerStatus: initialStatus,
        hiringOutcome: "OFFER_IN_PROGRESS",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ offer: { id: fresh.id, ...fresh.data() } });
  } catch (e) {
    console.error("POST /api/job/[jobId]/offers", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
