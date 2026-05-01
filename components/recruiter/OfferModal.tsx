"use client";

import { useEffect, useMemo, useState } from "react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useToast } from "@/components/NotificationSystem";
import { fetchCompanyTeamMembers } from "@/lib/collaboration-client";
import { createJobOffer, patchJobOffer } from "@/lib/offers/client";
import type { CandidateOfferRecord } from "@/lib/offers/types";
import { COMPENSATION_TYPES, type CompensationType } from "@/lib/offers/types";
import { recruiterBtnPrimary, recruiterBtnSecondary } from "@/lib/recruiter-ui";

type Props = {
  jobId: string;
  candidateId: string;
  candidateName?: string;
  jobTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  existingOffer?: CandidateOfferRecord | null;
  onSaved?: () => void;
};

export default function OfferModal({
  jobId,
  candidateId,
  candidateName,
  jobTitle,
  isOpen,
  onClose,
  existingOffer,
  onSaved,
}: Props) {
  const { user } = useFirebaseAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [title, setTitle] = useState("Offer");
  const [roleTitle, setRoleTitle] = useState("");
  const [employmentType, setEmploymentType] = useState("FULL_TIME");
  const [workLocation, setWorkLocation] = useState("");
  const [compensationType, setCompensationType] = useState<CompensationType>("SALARY");
  const [baseSalary, setBaseSalary] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [bonus, setBonus] = useState("");
  const [equity, setEquity] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [startDate, setStartDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [offerNotes, setOfferNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [approverIds, setApproverIds] = useState<string[]>([]);
  const [offerLetterUrl, setOfferLetterUrl] = useState("");
  const [offerLetterFileName, setOfferLetterFileName] = useState("");
  const [closeJobOnAccept, setCloseJobOnAccept] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [returnToStage, setReturnToStage] = useState("FINALIST");
  const [conflictOffer, setConflictOffer] = useState<CandidateOfferRecord | null>(null);

  const activeOffer = conflictOffer || existingOffer || null;
  const offerId = activeOffer?.id || null;
  const status = String(activeOffer?.status || "DRAFT").toUpperCase();

  useEffect(() => {
    if (!isOpen || !user) return;
    void (async () => {
      const token = await user.getIdToken();
      const res = await fetchCompanyTeamMembers(token);
      if (res.ok) setTeamMembers((res.data.members || []).map((m: any) => ({ id: m.id, name: m.name })));
    })();
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) return;
    setConflictOffer(null);
    const o = activeOffer;
    if (!o) {
      setTitle("Offer");
      setRoleTitle(jobTitle || "");
      setEmploymentType("FULL_TIME");
      setWorkLocation("");
      setCompensationType("SALARY");
      setBaseSalary("");
      setHourlyRate("");
      setBonus("");
      setEquity("");
      setCurrency("USD");
      setStartDate("");
      setExpirationDate("");
      setOfferNotes("");
      setInternalNotes("");
      setApprovalRequired(false);
      setApproverIds([]);
      setOfferLetterUrl("");
      setOfferLetterFileName("");
      setCloseJobOnAccept(false);
      setDeclineReason("");
      return;
    }
    setTitle(String(o.title || "Offer"));
    setRoleTitle(String(o.roleTitle || ""));
    setEmploymentType(String(o.employmentType || "FULL_TIME"));
    setWorkLocation(String(o.workLocation || ""));
    setCompensationType((o.compensationType as CompensationType) || "SALARY");
    setBaseSalary(o.baseSalary != null ? String(o.baseSalary) : "");
    setHourlyRate(o.hourlyRate != null ? String(o.hourlyRate) : "");
    setBonus(String(o.bonus || ""));
    setEquity(String(o.equity || ""));
    setCurrency(String(o.currency || "USD"));
    setStartDate(String(o.startDate || ""));
    setExpirationDate(String(o.expirationDate || ""));
    setOfferNotes(String(o.offerNotes || ""));
    setInternalNotes(String(o.internalNotes || ""));
    setApprovalRequired(Boolean(o.approvalRequired));
    setApproverIds(Array.isArray(o.approverUserIds) ? o.approverUserIds.map(String) : []);
    setOfferLetterUrl(String(o.offerLetterUrl || ""));
    setOfferLetterFileName(String(o.offerLetterFileName || ""));
  }, [isOpen, activeOffer, jobTitle]);

  const payloadBase = useMemo(
    () => ({
      title: title.trim(),
      roleTitle: roleTitle.trim() || jobTitle || "Role",
      employmentType,
      workLocation: workLocation.trim() || null,
      compensationType,
      baseSalary: baseSalary.trim() === "" ? null : Number(baseSalary),
      hourlyRate: hourlyRate.trim() === "" ? null : Number(hourlyRate),
      bonus: bonus.trim() || null,
      equity: equity.trim() || null,
      currency: currency.trim() || "USD",
      startDate: startDate.trim() || null,
      expirationDate: expirationDate.trim() || null,
      offerNotes: offerNotes.trim() || null,
      internalNotes: internalNotes.trim() || null,
      approvalRequired,
      approverUserIds: approverIds,
      offerLetterUrl: offerLetterUrl.trim() || null,
      offerLetterFileName: offerLetterFileName.trim() || null,
    }),
    [
      title,
      roleTitle,
      jobTitle,
      employmentType,
      workLocation,
      compensationType,
      baseSalary,
      hourlyRate,
      bonus,
      equity,
      currency,
      startDate,
      expirationDate,
      offerNotes,
      internalNotes,
      approvalRequired,
      approverIds,
      offerLetterUrl,
      offerLetterFileName,
    ]
  );

  const validatePayload = (): string | null => {
    if (payloadBase.baseSalary != null && (Number.isNaN(payloadBase.baseSalary) || payloadBase.baseSalary < 0)) {
      return "Base salary must be a non-negative number.";
    }
    if (payloadBase.hourlyRate != null && (Number.isNaN(payloadBase.hourlyRate) || payloadBase.hourlyRate < 0)) {
      return "Hourly rate must be a non-negative number.";
    }
    if (approvalRequired && approverIds.length === 0) {
      return "Select at least one approver when approval is required.";
    }
    return null;
  };

  const saveFields = async () => {
    if (!user) return;
    const err = validatePayload();
    if (err) {
      toast.error("Offer", err);
      return;
    }
    setBusy(true);
    try {
      const token = await user.getIdToken();
      if (!offerId) {
        const res = await createJobOffer(jobId, token, {
          candidateId,
          ...payloadBase,
        });
        if (!res.ok) {
          if (res.status === 409 && res.offer) {
            setConflictOffer(res.offer);
            toast.error("Offer", "An active offer already exists. Opened existing offer.");
            return;
          }
          toast.error("Offer", res.error || "Could not save");
          return;
        }
        toast.success("Offer saved", "Draft created.");
        onSaved?.();
        onClose();
        return;
      }
      const res = await patchJobOffer(jobId, offerId, token, { ...payloadBase });
      if (!res.ok) {
        toast.error("Offer", res.error || "Could not save");
        return;
      }
      toast.success("Offer saved", "Changes saved.");
      onSaved?.();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const doTransition = async (transition: string, extra: Record<string, unknown> = {}) => {
    if (!user || !offerId) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await patchJobOffer(jobId, offerId, token, { transition, ...payloadBase, ...extra });
      if (!res.ok) {
        toast.error("Offer", res.error || "Update failed");
        return;
      }
      toast.success("Offer updated", "");
      onSaved?.();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  const editable = status === "DRAFT" || status === "PENDING_APPROVAL";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:p-4 sm:items-center">
      <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
        <div className="shrink-0 border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-navy-900">
            {existingOffer ? "Edit offer" : "Create offer"} for {candidateName || "Candidate"}
          </h2>
          {jobTitle ? <p className="mt-1 text-sm text-slate-600">{jobTitle}</p> : null}
          <p className="mt-1 text-xs text-slate-500">Status: {status}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Offer title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!editable}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Role title</label>
              <input
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                disabled={!editable}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Employment type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                disabled={!editable}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              >
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Work location</label>
              <input
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
                disabled={!editable}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                placeholder="City, hybrid, remote…"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Compensation type</label>
              <select
                value={compensationType}
                onChange={(e) => setCompensationType(e.target.value as CompensationType)}
                disabled={!editable}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              >
                {COMPENSATION_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {c === "SALARY" ? "Salary" : c === "HOURLY" ? "Hourly" : c === "CONTRACT" ? "Contract" : "Other"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Currency</label>
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={!editable}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Base salary (internal)</label>
              <input
                type="number"
                min={0}
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                disabled={!editable}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Hourly rate (internal)</label>
              <input
                type="number"
                min={0}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                disabled={!editable}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Bonus</label>
              <input
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                disabled={!editable}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Equity</label>
              <input
                value={equity}
                onChange={(e) => setEquity(e.target.value)}
                disabled={!editable}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Target start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={!editable}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Offer expiration</label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                disabled={!editable && status !== "APPROVED"}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Candidate-facing notes</label>
              <textarea
                value={offerNotes}
                onChange={(e) => setOfferNotes(e.target.value)}
                disabled={!editable}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Internal notes (never shown to candidate)</label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                disabled={!editable}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Offer letter URL</label>
              <input
                value={offerLetterUrl}
                onChange={(e) => setOfferLetterUrl(e.target.value)}
                disabled={!editable}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                placeholder="https://…"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Attach or link an offer letter. Document generation can be added later.
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Offer letter file name (optional)</label>
              <input
                value={offerLetterFileName}
                onChange={(e) => setOfferLetterFileName(e.target.value)}
                disabled={!editable}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                id="approvalReq"
                type="checkbox"
                checked={approvalRequired}
                onChange={(e) => setApprovalRequired(e.target.checked)}
                disabled={!editable}
              />
              <label htmlFor="approvalReq" className="text-sm text-slate-700">
                Approval required before sending
              </label>
            </div>
            {approvalRequired && editable ? (
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Approvers</label>
                <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {teamMembers.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={approverIds.includes(m.id)}
                        onChange={() =>
                          setApproverIds((prev) =>
                            prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id]
                          )
                        }
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {status === "SENT" ? (
            <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700">Candidate response</p>
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={closeJobOnAccept} onChange={(e) => setCloseJobOnAccept(e.target.checked)} />
                When accepted, also mark job as closed (filled)
              </label>
              <div>
                <label className="text-xs text-slate-600">If declining — reason (optional)</label>
                <input
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">If declining — return pipeline to</label>
                <select
                  value={returnToStage}
                  onChange={(e) => setReturnToStage(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                >
                  <option value="FINALIST">Finalist</option>
                  <option value="OFFER">Offer</option>
                  <option value="INTERVIEW">Interview</option>
                </select>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
          <button type="button" className={recruiterBtnSecondary} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          {editable ? (
            <button type="button" className={recruiterBtnPrimary} disabled={busy} onClick={() => void saveFields()}>
              Save draft
            </button>
          ) : null}
          {status === "DRAFT" && approvalRequired && offerId ? (
            <button
              type="button"
              className={recruiterBtnPrimary}
              disabled={busy}
              onClick={() => void doTransition("SUBMIT_FOR_APPROVAL")}
            >
              Submit for approval
            </button>
          ) : null}
          {status === "PENDING_APPROVAL" && offerId ? (
            <button type="button" className={recruiterBtnPrimary} disabled={busy} onClick={() => void doTransition("APPROVE")}>
              Approve offer
            </button>
          ) : null}
          {(status === "APPROVED" || (status === "DRAFT" && !approvalRequired)) && offerId ? (
            <button type="button" className={recruiterBtnPrimary} disabled={busy} onClick={() => void doTransition("SEND")}>
              Send offer
            </button>
          ) : null}
          {status === "SENT" && offerId ? (
            <>
              <button
                type="button"
                className={recruiterBtnPrimary}
                disabled={busy}
                onClick={() => void doTransition("ACCEPT", { closeJob: closeJobOnAccept })}
              >
                Mark accepted
              </button>
              <button
                type="button"
                className={recruiterBtnSecondary}
                disabled={busy}
                onClick={() => void doTransition("DECLINE", { declineReason: declineReason || "Declined", returnToStage })}
              >
                Mark declined
              </button>
              <button type="button" className={recruiterBtnSecondary} disabled={busy} onClick={() => void doTransition("WITHDRAW")}>
                Withdraw
              </button>
            </>
          ) : null}
          {["DRAFT", "PENDING_APPROVAL", "APPROVED"].includes(status) && offerId && status !== "SENT" ? (
            <button type="button" className={recruiterBtnSecondary} disabled={busy} onClick={() => void doTransition("WITHDRAW")}>
              Withdraw
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
