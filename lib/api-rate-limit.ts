import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function keyForRequest(routeKey: string, request: NextRequest, uid?: string | null) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return `${routeKey}:${uid || ip}`;
}

/**
 * Best-effort in-memory rate limit for serverless (per-instance). Prefer Upstash/Vercel KV in production at scale.
 * @returns null if allowed, or seconds until retry if blocked.
 */
export function rateLimitHit(
  routeKey: string,
  request: NextRequest,
  options: { windowMs: number; max: number; uid?: string | null }
): number | null {
  const k = keyForRequest(routeKey, request, options.uid);
  const now = Date.now();
  const b = buckets.get(k);
  if (!b || now >= b.resetAt) {
    buckets.set(k, { count: 1, resetAt: now + options.windowMs });
    return null;
  }
  if (b.count >= options.max) {
    return Math.ceil((b.resetAt - now) / 1000);
  }
  b.count += 1;
  return null;
}
