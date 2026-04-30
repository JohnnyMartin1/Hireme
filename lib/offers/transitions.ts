import type { OfferStatus } from "./types";

/** Allowed single-step status transitions (MVP). */
export const OFFER_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  DRAFT: ["PENDING_APPROVAL", "APPROVED", "SENT", "WITHDRAWN"],
  PENDING_APPROVAL: ["APPROVED", "DRAFT", "WITHDRAWN"],
  APPROVED: ["SENT", "WITHDRAWN"],
  SENT: ["ACCEPTED", "DECLINED", "WITHDRAWN"],
  ACCEPTED: [],
  DECLINED: [],
  WITHDRAWN: [],
};

export function canTransition(from: OfferStatus, to: OfferStatus): boolean {
  return OFFER_TRANSITIONS[from]?.includes(to) ?? false;
}
