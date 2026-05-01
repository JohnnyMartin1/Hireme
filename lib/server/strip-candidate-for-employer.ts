const SENSITIVE_KEYS = new Set([
  "email",
  "phone",
  "phoneNumber",
  "notificationPreferences",
  "emailVerificationPending",
  "verificationCodes",
  "calendarIntegration",
  "googleCalendarTokens",
  "microsoftCalendarTokens",
]);

/** Remove fields employers must not receive via API (server-side field mask). */
export function stripCandidateUserForEmployerResponse(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(k)) continue;
    if (k.startsWith("oauth") || k.endsWith("Token") || k.endsWith("Secret")) continue;
    out[k] = v;
  }
  return out;
}
