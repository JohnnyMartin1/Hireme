"use client";

import { useCallback, useEffect, useState } from "react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { fetchJobOffers, offerStatusLabel, pickLatestOfferForCandidate } from "@/lib/offers/client";
import type { CandidateOfferRecord } from "@/lib/offers/types";
import { recruiterBtnSecondary, recruiterBadge } from "@/lib/recruiter-ui";
import OfferModal from "@/components/recruiter/OfferModal";

type Props = {
  jobId: string;
  candidateId: string;
  candidateName?: string;
  jobTitle?: string;
};

export default function CandidateOfferPanel({ jobId, candidateId, candidateName, jobTitle }: Props) {
  const { user } = useFirebaseAuth();
  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<CandidateOfferRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user || !jobId || !candidateId) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetchJobOffers(jobId, token, candidateId);
      if (!res.ok) {
        setOffer(null);
        return;
      }
      setOffer(pickLatestOfferForCandidate(res.data.offers, candidateId));
    } finally {
      setLoading(false);
    }
  }, [user, jobId, candidateId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!jobId) {
    return null;
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading offer…</div>
    );
  }

  return (
    <div id="recruiter-offer-panel" className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-navy-900">Offer</h3>
        <button type="button" className={recruiterBtnSecondary} onClick={() => setModalOpen(true)}>
          {offer ? "View / edit offer" : "Create offer"}
        </button>
      </div>

      {!offer ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
          <p className="font-medium text-navy-900">No offer yet</p>
          <p className="mt-1 text-xs text-slate-600">Create an offer once the team is ready to move forward.</p>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${recruiterBadge.pending}`}>
              {offerStatusLabel(offer.status)}
            </span>
            <span className="text-slate-600">{offer.title}</span>
          </div>
          <p className="text-xs text-slate-500">
            Role: <span className="font-medium text-slate-700">{offer.roleTitle}</span>
          </p>
        </div>
      )}

      <OfferModal
        jobId={jobId}
        candidateId={candidateId}
        candidateName={candidateName}
        jobTitle={jobTitle}
        isOpen={modalOpen}
        existingOffer={offer}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          void load();
        }}
      />
    </div>
  );
}
