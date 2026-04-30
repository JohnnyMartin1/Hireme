import type { CandidateOfferRecord } from "@/lib/offers/types";

export type JobOffersResponse = {
  offers: CandidateOfferRecord[];
  counts: Record<string, number>;
};

type OfferApiPayload = {
  offer?: CandidateOfferRecord;
  error?: string;
  existingOfferId?: string;
};

export async function fetchJobOffers(
  jobId: string,
  idToken: string,
  candidateId?: string | null
): Promise<{ ok: boolean; data: JobOffersResponse; error: string | null }> {
  const q = candidateId ? `?candidateId=${encodeURIComponent(candidateId)}` : "";
  const res = await fetch(`/api/job/${encodeURIComponent(jobId)}/offers${q}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const data = (await res.json().catch(() => ({}))) as JobOffersResponse & { error?: string };
  if (!res.ok) return { ok: false, data: { offers: [], counts: {} }, error: data?.error || "Failed to load offers" };
  return { ok: true, data: { offers: data.offers || [], counts: data.counts || {} }, error: null };
}

export async function createJobOffer(
  jobId: string,
  idToken: string,
  body: Record<string, unknown>
): Promise<{
  ok: boolean;
  offer: CandidateOfferRecord | null;
  error: string | null;
  status: number;
  existingOfferId: string | null;
}> {
  const res = await fetch(`/api/job/${encodeURIComponent(jobId)}/offers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as OfferApiPayload;
  if (!res.ok) {
    return {
      ok: false,
      offer: (data.offer as CandidateOfferRecord) || null,
      error: data?.error || "Failed to create offer",
      status: res.status,
      existingOfferId: data?.existingOfferId ? String(data.existingOfferId) : null,
    };
  }
  return {
    ok: true,
    offer: (data.offer as CandidateOfferRecord) || null,
    error: null,
    status: res.status,
    existingOfferId: null,
  };
}

export async function patchJobOffer(
  jobId: string,
  offerId: string,
  idToken: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; offer: CandidateOfferRecord | null; error: string | null; status: number }> {
  const res = await fetch(`/api/job/${encodeURIComponent(jobId)}/offers/${encodeURIComponent(offerId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as OfferApiPayload;
  if (!res.ok) return { ok: false, offer: null, error: data?.error || "Failed to update offer", status: res.status };
  return { ok: true, offer: (data.offer as CandidateOfferRecord) || null, error: null, status: res.status };
}

/** Prefer active offers; then most recently updated. */
export function pickLatestOfferForCandidate(offers: CandidateOfferRecord[], candidateId: string): CandidateOfferRecord | null {
  const list = offers.filter((o) => String(o.candidateId) === candidateId);
  if (!list.length) return null;
  const priority = (s: string) => {
    const u = s.toUpperCase();
    if (["SENT", "PENDING_APPROVAL", "APPROVED", "DRAFT"].includes(u)) return 4;
    if (u === "ACCEPTED") return 3;
    if (u === "DECLINED" || u === "WITHDRAWN") return 1;
    return 2;
  };
  return list.sort((a, b) => {
    const pa = priority(String(a.status));
    const pb = priority(String(b.status));
    if (pb !== pa) return pb - pa;
    const ta = (a as any).updatedAt?.toMillis?.() ?? (a as any).createdAt?.toMillis?.() ?? 0;
    const tb = (b as any).updatedAt?.toMillis?.() ?? (b as any).createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  })[0];
}

export function offerStatusLabel(status: string | undefined | null): string {
  const s = String(status || "").toUpperCase();
  const map: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_APPROVAL: "Pending approval",
    APPROVED: "Approved",
    SENT: "Sent",
    ACCEPTED: "Accepted",
    DECLINED: "Declined",
    WITHDRAWN: "Withdrawn",
  };
  return map[s] || s || "—";
}
