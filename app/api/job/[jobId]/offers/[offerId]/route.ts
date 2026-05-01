import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canUserAccessJob } from "@/lib/matching/job-access";
import { canonicalPipelineEntryId } from "@/lib/pipeline-canonical";
import admin from "firebase-admin";
import { canTransition } from "@/lib/offers/transitions";
import {
  COMPENSATION_TYPES,
  OFFER_APPROVAL_STATUSES,
  normalizeCompensationType,
  normalizeOfferStatus,
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

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function parseYmd(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

async function withdrawOtherActiveOffers(jobId: string, candidateId: string, keepOfferId: string, batch: admin.firestore.WriteBatch) {
  const snap = await adminDb.collection("candidateOffers").where("jobId", "==", jobId).where("candidateId", "==", candidateId).get();
  const active: OfferStatus[] = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT"];
  for (const d of snap.docs) {
    if (d.id === keepOfferId) continue;
    const st = normalizeOfferStatus(d.data()?.status);
    if (!active.includes(st)) continue;
    batch.update(d.ref, {
      status: "WITHDRAWN",
      withdrawnAt: admin.firestore.FieldValue.serverTimestamp(),
      declineReason: "Superseded by accepted offer",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

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

function isCompanyOwner(jobData: Record<string, unknown>, uid: string): boolean {
  return String(jobData.employerId || "") === uid;
}

function makePipelineSummaryPatch(status: OfferStatus, offerId: string) {
  if (status === "SENT") {
    return {
      currentOfferId: offerId,
      offerStatus: "SENT",
      hiringOutcome: "OFFER_IN_PROGRESS",
      stage: "OFFER",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
  }
  if (status === "APPROVED" || status === "PENDING_APPROVAL" || status === "DRAFT") {
    return {
      currentOfferId: offerId,
      offerStatus: status,
      hiringOutcome: "OFFER_IN_PROGRESS",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
  }
  return {
    currentOfferId: offerId,
    offerStatus: status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function pickPipelineCurrentOffer(jobId: string, candidateId: string) {
  const snap = await adminDb.collection("candidateOffers").where("jobId", "==", jobId).where("candidateId", "==", candidateId).get();
  const rank = (status: OfferStatus) => {
    if (status === "SENT") return 6;
    if (status === "PENDING_APPROVAL") return 5;
    if (status === "APPROVED") return 4;
    if (status === "DRAFT") return 3;
    if (status === "ACCEPTED") return 2;
    if (status === "DECLINED") return 1;
    return 0;
  };
  const list = snap.docs
    .map((d) => ({ id: d.id, data: d.data(), status: normalizeOfferStatus(d.data()?.status) }))
    .sort((a, b) => {
      const rb = rank(b.status);
      const ra = rank(a.status);
      if (rb !== ra) return rb - ra;
      const tb = (b.data as any)?.updatedAt?.toMillis?.() ?? (b.data as any)?.createdAt?.toMillis?.() ?? 0;
      const ta = (a.data as any)?.updatedAt?.toMillis?.() ?? (a.data as any)?.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
  return list[0] || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string; offerId: string } }
) {
  try {
    const { jobId, offerId } = params;
    if (!jobId || !offerId) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const auth = await authorizeOffersRequest(request, jobId);
    if (auth.error) return auth.error;

    const ref = adminDb.collection("candidateOffers").doc(offerId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    const data = snap.data() as Record<string, unknown>;
    if (String(data.jobId || "") !== jobId) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }
    return NextResponse.json({ offer: { id: snap.id, ...data } });
  } catch (e) {
    console.error("GET offer", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { jobId: string; offerId: string } }
) {
  try {
    const { jobId, offerId } = params;
    if (!jobId || !offerId) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const auth = await authorizeOffersRequest(request, jobId);
    if (auth.error) return auth.error;

    const ref = adminDb.collection("candidateOffers").doc(offerId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    const existing = (snap.data() || {}) as Record<string, unknown>;
    if (String(existing.jobId || "") !== jobId) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }
    const candidateId = String(existing.candidateId || "");
    if (!candidateId) return NextResponse.json({ error: "Invalid offer" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const uid = auth.decoded!.uid;
    const role = auth.role!;
    const companyId = String(auth.jobData?.companyId || "");
    const creatorId = String(existing.createdBy || "");

    const currentStatus = normalizeOfferStatus(existing.status);
    const updates: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const transition = String(body?.transition || "").toUpperCase().trim();
    const editable = currentStatus === "DRAFT" || currentStatus === "PENDING_APPROVAL";

    const mergeFieldPatch = async () => {
      if (body.title !== undefined) updates.title = String(body.title || "").trim() || existing.title;
      if (body.roleTitle !== undefined) updates.roleTitle = String(body.roleTitle || "").trim();
      if (body.compensationType !== undefined) {
        const ct = normalizeCompensationType(body.compensationType);
        if (COMPENSATION_TYPES.includes(ct)) updates.compensationType = ct;
      }
      if (body.baseSalary !== undefined) {
        const n = numOrNull(body.baseSalary);
        if (n !== null && n < 0) throw new Error("baseSalary must be non-negative");
        updates.baseSalary = n;
      }
      if (body.hourlyRate !== undefined) {
        const n = numOrNull(body.hourlyRate);
        if (n !== null && n < 0) throw new Error("hourlyRate must be non-negative");
        updates.hourlyRate = n;
      }
      if (body.bonus !== undefined) updates.bonus = strOrNull(body.bonus);
      if (body.equity !== undefined) updates.equity = strOrNull(body.equity);
      if (body.currency !== undefined) updates.currency = String(body.currency || "USD").trim();
      if (body.startDate !== undefined) updates.startDate = strOrNull(body.startDate);
      if (body.workLocation !== undefined) updates.workLocation = strOrNull(body.workLocation);
      if (body.employmentType !== undefined) updates.employmentType = strOrNull(body.employmentType);
      if (body.expirationDate !== undefined) updates.expirationDate = strOrNull(body.expirationDate);
      if (body.offerNotes !== undefined) updates.offerNotes = strOrNull(body.offerNotes);
      if (body.internalNotes !== undefined) updates.internalNotes = strOrNull(body.internalNotes);
      if (body.offerLetterUrl !== undefined) updates.offerLetterUrl = strOrNull(body.offerLetterUrl);
      if (body.offerLetterFileName !== undefined) updates.offerLetterFileName = strOrNull(body.offerLetterFileName);
      if (body.approvalRequired !== undefined) updates.approvalRequired = Boolean(body.approvalRequired);
      if (Array.isArray(body.approverUserIds)) {
        const approverValidation = await validateApproversForJob(companyId, dedupeIds(body.approverUserIds));
        if (!approverValidation.ok) {
          throw new Error(approverValidation.error);
        }
        updates.approverUserIds = approverValidation.validIds;
      }
      const nextApprovalRequired = body.approvalRequired !== undefined ? Boolean(body.approvalRequired) : Boolean(existing.approvalRequired);
      const nextApprovers = Array.isArray(updates.approverUserIds)
        ? (updates.approverUserIds as string[])
        : dedupeIds(existing.approverUserIds);
      const nextApproverValidation = await validateApproversForJob(companyId, nextApprovers);
      if (!nextApproverValidation.ok) {
        throw new Error(nextApproverValidation.error);
      }
      if (nextApprovalRequired && nextApprovers.length === 0) {
        throw new Error("approvalRequired offers need at least one valid approverUserId");
      }
      updates.approverUserIds = nextApproverValidation.validIds;
      if (nextApprovalRequired) {
        updates.approvalStatus = "PENDING";
      } else {
        updates.approvalStatus = "NOT_REQUIRED";
      }
      if (!OFFER_APPROVAL_STATUSES.includes(String(updates.approvalStatus || existing.approvalStatus || "NOT_REQUIRED") as any)) {
        throw new Error("Invalid approvalStatus");
      }
    };

    if (!transition) {
      if (!editable) {
        return NextResponse.json({ error: "Offer is not editable in this status" }, { status: 400 });
      }
      try {
        await mergeFieldPatch();
      } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Validation failed" }, { status: 400 });
      }
      await ref.update(updates);
      const out = await ref.get();
      return NextResponse.json({ offer: { id: out.id, ...out.data() } });
    }

    const approvers = dedupeIds(existing.approverUserIds);
    const requiresApproval = Boolean(existing.approvalRequired);
    const owner = isCompanyOwner(auth.jobData || {}, uid);
    const canApprove = role === "ADMIN" || owner || approvers.includes(uid);

    let resultingStatus: OfferStatus = currentStatus;

    if (transition === "SUBMIT_FOR_APPROVAL") {
      if (!canTransition(currentStatus, "PENDING_APPROVAL")) {
        return NextResponse.json({ error: "Invalid transition" }, { status: 400 });
      }
      const approverValidation = await validateApproversForJob(companyId, approvers);
      if (!approverValidation.ok) {
        return NextResponse.json({ error: approverValidation.error }, { status: 400 });
      }
      if (approverValidation.validIds.length === 0) {
        return NextResponse.json({ error: "approvalRequired offers need at least one valid approverUserId" }, { status: 400 });
      }
      resultingStatus = "PENDING_APPROVAL";
      Object.assign(updates, {
        status: "PENDING_APPROVAL",
        approvalStatus: "PENDING",
        approvalRequired: true,
        approverUserIds: approverValidation.validIds,
      });
    } else if (transition === "APPROVE") {
      if (!canApprove) return NextResponse.json({ error: "Not authorized to approve" }, { status: 403 });
      if (requiresApproval && uid === creatorId && approvers.length > 1 && role !== "ADMIN" && !owner) {
        return NextResponse.json({ error: "This offer requires approval from another approver." }, { status: 403 });
      }
      if (!canTransition(currentStatus, "APPROVED")) {
        return NextResponse.json({ error: "Invalid transition" }, { status: 400 });
      }
      resultingStatus = "APPROVED";
      Object.assign(updates, {
        status: "APPROVED",
        approvalStatus: "APPROVED",
        approvedBy: uid,
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (transition === "MOVE_TO_APPROVED") {
      if (!canTransition(currentStatus, "APPROVED")) {
        return NextResponse.json({ error: "Invalid transition" }, { status: 400 });
      }
      resultingStatus = "APPROVED";
      Object.assign(updates, {
        status: "APPROVED",
        approvalStatus: "NOT_REQUIRED",
      });
    } else if (transition === "SEND") {
      if (!canTransition(currentStatus, "SENT")) {
        return NextResponse.json({ error: "Invalid transition" }, { status: 400 });
      }
      const exp = strOrNull(body.expirationDate ?? existing.expirationDate);
      if (exp) {
        const expD = parseYmd(exp);
        if (expD && expD.getTime() < startOfTodayUtc().getTime()) {
          return NextResponse.json({ error: "expirationDate cannot be before today" }, { status: 400 });
        }
      }
      if (body.expirationDate !== undefined) updates.expirationDate = strOrNull(body.expirationDate);
      resultingStatus = "SENT";
      Object.assign(updates, {
        status: "SENT",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (transition === "ACCEPT") {
      if (!canTransition(currentStatus, "ACCEPTED")) {
        return NextResponse.json({ error: "Invalid transition" }, { status: 400 });
      }
      const batch = adminDb.batch();
      batch.update(ref, {
        ...updates,
        status: "ACCEPTED",
        acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await withdrawOtherActiveOffers(jobId, candidateId, offerId, batch);
      const pipelineId = canonicalPipelineEntryId(jobId, candidateId);
      batch.set(
        adminDb.collection("candidatePipelineEntries").doc(pipelineId),
        {
          stage: "HIRED",
          currentOfferId: offerId,
          offerStatus: "ACCEPTED",
          hiringOutcome: "HIRED",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      if (body.closeJob === true) {
        batch.update(adminDb.collection("jobs").doc(jobId), {
          status: "CLOSED",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
      const out = await ref.get();
      return NextResponse.json({ offer: { id: out.id, ...out.data() } });
    } else if (transition === "DECLINE") {
      if (!canTransition(currentStatus, "DECLINED")) {
        return NextResponse.json({ error: "Invalid transition" }, { status: 400 });
      }
      const returnTo = String(body.returnToStage || "FINALIST").toUpperCase();
      const allowedReturn = ["FINALIST", "OFFER", "INTERVIEW"];
      const stage = allowedReturn.includes(returnTo) ? returnTo : "FINALIST";
      const pipelineId = canonicalPipelineEntryId(jobId, candidateId);
      await adminDb.runTransaction(async (tx) => {
        tx.update(ref, {
          ...updates,
          status: "DECLINED",
          declinedAt: admin.firestore.FieldValue.serverTimestamp(),
          declineReason: strOrNull(body.declineReason) || "Declined",
        });
        tx.set(
          adminDb.collection("candidatePipelineEntries").doc(pipelineId),
          {
            stage,
            currentOfferId: offerId,
            offerStatus: "DECLINED",
            hiringOutcome: "DECLINED",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });
      const picked = await pickPipelineCurrentOffer(jobId, candidateId);
      if (picked) {
        const summaryStage = picked.status === "SENT" ? "OFFER" : stage;
        await adminDb.collection("candidatePipelineEntries").doc(pipelineId).set(
          {
            currentOfferId: picked.id,
            offerStatus: picked.status,
            hiringOutcome: picked.status === "SENT" || picked.status === "APPROVED" || picked.status === "PENDING_APPROVAL" || picked.status === "DRAFT"
              ? "OFFER_IN_PROGRESS"
              : picked.status === "ACCEPTED"
                ? "HIRED"
                : "DECLINED",
            stage: summaryStage,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
      const out = await ref.get();
      return NextResponse.json({ offer: { id: out.id, ...out.data() } });
    } else if (transition === "WITHDRAW") {
      if (!canTransition(currentStatus, "WITHDRAWN")) {
        return NextResponse.json({ error: "Invalid transition" }, { status: 400 });
      }
      const pipelineId = canonicalPipelineEntryId(jobId, candidateId);
      await adminDb.runTransaction(async (tx) => {
        tx.update(ref, {
          ...updates,
          status: "WITHDRAWN",
          withdrawnAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.set(
          adminDb.collection("candidatePipelineEntries").doc(pipelineId),
          {
            currentOfferId: null,
            offerStatus: "WITHDRAWN",
            hiringOutcome: "NOT_HIRED",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });
      const picked = await pickPipelineCurrentOffer(jobId, candidateId);
      if (picked) {
        await adminDb.collection("candidatePipelineEntries").doc(pipelineId).set(
          {
            currentOfferId: picked.status === "WITHDRAWN" ? null : picked.id,
            offerStatus: picked.status === "WITHDRAWN" ? "WITHDRAWN" : picked.status,
            hiringOutcome:
              picked.status === "SENT" || picked.status === "APPROVED" || picked.status === "PENDING_APPROVAL" || picked.status === "DRAFT"
                ? "OFFER_IN_PROGRESS"
                : picked.status === "ACCEPTED"
                  ? "HIRED"
                  : "NOT_HIRED",
            ...(picked.status === "SENT" ? { stage: "OFFER" } : {}),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
      const out = await ref.get();
      return NextResponse.json({ offer: { id: out.id, ...out.data() } });
    } else {
      return NextResponse.json({ error: "Unknown transition" }, { status: 400 });
    }

    if (editable) {
      try {
        await mergeFieldPatch();
      } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Validation failed" }, { status: 400 });
      }
    }

    await ref.update(updates);

    const pipelineId = canonicalPipelineEntryId(jobId, candidateId);
    const pipelineRef = adminDb.collection("candidatePipelineEntries").doc(pipelineId);

    if (resultingStatus === "SENT") {
      await pipelineRef.set(makePipelineSummaryPatch("SENT", offerId), { merge: true });
    } else if (resultingStatus === "APPROVED" || resultingStatus === "PENDING_APPROVAL" || resultingStatus === "DRAFT") {
      await pipelineRef.set(makePipelineSummaryPatch(resultingStatus, offerId), { merge: true });
    } else if (resultingStatus === "WITHDRAWN") {
      await pipelineRef.set(
        {
          currentOfferId: null,
          offerStatus: "WITHDRAWN",
          hiringOutcome: "NOT_HIRED",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    const out = await ref.get();
    return NextResponse.json({ offer: { id: out.id, ...out.data() } });
  } catch (e) {
    console.error("PATCH offer", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
