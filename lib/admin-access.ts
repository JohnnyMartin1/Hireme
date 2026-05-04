/**
 * Central admin allowlist for API routes (server) and UI gating (client).
 * Set ADMIN_EMAILS (comma-separated) or ADMIN_EMAIL on the server.
 * Optional NEXT_PUBLIC_ADMIN_EMAILS for client-side admin UI (same addresses).
 */

export const LEGACY_ADMIN_FALLBACK_EMAIL = "officialhiremeapp@gmail.com";

function normalizeEmailList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Server-only: ADMIN_EMAILS or ADMIN_EMAIL, then legacy fallback. */
export function getServerAdminEmailsLowercase(): string[] {
  const multi = normalizeEmailList(process.env.ADMIN_EMAILS || "");
  if (multi.length) return [...new Set(multi)];
  const single = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (single) return [single];
  if (process.env.NODE_ENV !== "production") {
    return [LEGACY_ADMIN_FALLBACK_EMAIL.toLowerCase()];
  }
  return [];
}

/**
 * Client + server: NEXT_PUBLIC_ADMIN_EMAILS (comma) if set; else legacy single email.
 * Without NEXT_PUBLIC_*, production admin UI still matches the historical inbox.
 */
export function getPublicAdminEmailsLowercase(): string[] {
  const multi = normalizeEmailList(process.env.NEXT_PUBLIC_ADMIN_EMAILS || "");
  if (multi.length) return [...new Set(multi)];
  return [LEGACY_ADMIN_FALLBACK_EMAIL.toLowerCase()];
}

/** True if Firebase profile role is ADMIN or email is in the server allowlist. */
export function isServerAdminUser(
  profileRole: string | null | undefined,
  email: string | null | undefined
): boolean {
  if (String(profileRole || "").toUpperCase() === "ADMIN") return true;
  const e = (email || "").toLowerCase();
  if (!e) return false;
  return getServerAdminEmailsLowercase().includes(e);
}

/** Client UI: role ADMIN or email in public allowlist. */
export function isClientAdminUser(
  profileRole: string | null | undefined,
  email: string | null | undefined
): boolean {
  if (String(profileRole || "").toUpperCase() === "ADMIN") return true;
  const e = (email || "").toLowerCase();
  if (!e) return false;
  return getPublicAdminEmailsLowercase().includes(e);
}
