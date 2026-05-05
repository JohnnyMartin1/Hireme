import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import type { NextRequest } from "next/server";

export type AuditOutcome = "success" | "denied" | "error";

/** Coarse client network prefix for correlation (not a full IP store). */
export function requestIpPrefix(request: NextRequest | undefined): string | null {
  if (!request) return null;
  const raw =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "";
  if (!raw || raw === "unknown") return null;
  if (raw.includes(".")) {
    const parts = raw.split(".");
    if (parts.length >= 2) return `${parts[0]}.${parts[1]}.x.x`;
  }
  if (raw.includes(":")) {
    const seg = raw.split(":")[0];
    return seg ? `${seg}:` : null;
  }
  return null;
}

export function safeUserAgent(request: NextRequest | undefined): string | null {
  const ua = request?.headers.get("user-agent") || "";
  if (!ua) return null;
  return ua.slice(0, 240);
}

export type AuditLogInput = {
  eventType: string;
  outcome: AuditOutcome;
  actorUserId?: string | null;
  actorRole?: string | null;
  actorCompanyId?: string | null;
  targetUserId?: string | null;
  targetCompanyId?: string | null;
  jobId?: string | null;
  candidateId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  request?: NextRequest;
};

const SENSITIVE_META_KEYS = /token|secret|authorization|password|bearer|dsn|private.?key|signed|refresh|access/i;

function scrubMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_META_KEYS.test(k)) continue;
    if (typeof v === "string" && (v.startsWith("http") || v.length > 500)) continue;
    out[k] = v;
  }
  return out;
}

/** Append-only audit trail (Admin SDK). Do not log tokens, signed URLs, or file contents. */
export async function writeAuditLog(entry: AuditLogInput): Promise<void> {
  try {
    const meta = entry.metadata && Object.keys(entry.metadata).length ? scrubMetadata(entry.metadata) : null;
    await adminDb.collection("auditLogs").add({
      eventType: entry.eventType,
      outcome: entry.outcome,
      actorUserId: entry.actorUserId ?? null,
      actorRole: entry.actorRole ?? null,
      actorCompanyId: entry.actorCompanyId ?? null,
      targetUserId: entry.targetUserId ?? null,
      targetCompanyId: entry.targetCompanyId ?? null,
      jobId: entry.jobId ?? null,
      candidateId: entry.candidateId ?? null,
      resourceType: entry.resourceType ?? null,
      resourceId: entry.resourceId ?? null,
      requestIpPrefix: requestIpPrefix(entry.request),
      userAgent: safeUserAgent(entry.request),
      metadata: meta && Object.keys(meta).length ? meta : null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("[audit-log] write failed", entry.eventType, e);
  }
}
