"use client";

import type { ReviewAssignmentStatus } from "@/lib/collaboration";

export default function ReviewAssignmentStatusBadge({ status }: { status: ReviewAssignmentStatus | string }) {
  const normalized = String(status || "REQUESTED").toUpperCase();
  const cls =
    normalized === "COMPLETED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : normalized === "DECLINED"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : normalized === "VIEWED"
          ? "border-sky-200 bg-sky-50 text-sky-800"
          : "border-amber-200 bg-amber-50 text-amber-800";
  const label =
    normalized === "COMPLETED" ? "Completed" : normalized === "DECLINED" ? "Declined" : normalized === "VIEWED" ? "Viewed" : "Requested";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}
