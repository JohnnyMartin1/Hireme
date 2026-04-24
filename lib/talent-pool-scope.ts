/**
 * Stable company scope for talent pools. Real companyId when present;
 * otherwise a personal namespace so solo employers still get CRM pools.
 */
export function effectiveTalentCompanyId(
  profile: Record<string, unknown> | null | undefined,
  userId: string
): string {
  const c = profile?.companyId != null ? String(profile.companyId).trim() : "";
  if (c) return c;
  return `__personal_${userId}`;
}
