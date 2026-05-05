import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitOptions = { windowMs: number; max: number; uid?: string | null };

function keyForRequest(routeKey: string, request: NextRequest, uid?: string | null) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return `${routeKey}:${uid || ip}`;
}

function getKvConfig() {
  const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const token = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  if (!url || !token) return null;
  return { url, token };
}

function toSeconds(ms: number) {
  return Math.max(1, Math.ceil(ms / 1000));
}

async function hitDistributedLimiter(
  routeKey: string,
  request: NextRequest,
  options: RateLimitOptions
): Promise<number | null> {
  const cfg = getKvConfig();
  if (!cfg) return null;
  const key = `rl:${keyForRequest(routeKey, request, options.uid)}`;
  const ttlSeconds = toSeconds(options.windowMs);
  try {
    const incrRes = await fetch(`${cfg.url}/incr/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}` },
      cache: "no-store",
    });
    if (!incrRes.ok) return null;
    const incrData = (await incrRes.json().catch(() => null)) as { result?: number } | null;
    const count = Number(incrData?.result || 0);
    if (!Number.isFinite(count) || count <= 0) return null;

    if (count === 1) {
      await fetch(`${cfg.url}/expire/${encodeURIComponent(key)}/${ttlSeconds}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.token}` },
      }).catch(() => null);
    }

    if (count > options.max) {
      const ttlRes = await fetch(`${cfg.url}/ttl/${encodeURIComponent(key)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${cfg.token}` },
        cache: "no-store",
      });
      if (!ttlRes.ok) return 1;
      const ttlData = (await ttlRes.json().catch(() => null)) as { result?: number } | null;
      const ttl = Math.max(1, Number(ttlData?.result || 1));
      return ttl;
    }
    return null;
  } catch {
    return null;
  }
}

export function isDistributedRateLimiterConfigured(): boolean {
  return getKvConfig() !== null;
}

function isProductionScaleDeploy(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function effectiveMaxForRoute(routeKey: string, requestedMax: number): number {
  if (!isProductionScaleDeploy()) return requestedMax;
  if (getKvConfig()) return requestedMax;
  const reduced = Math.max(1, Math.floor(requestedMax / 4));
  console.error(
    `[hireme][rate-limit] Production without KV/Upstash (KV_REST_API_URL + KV_REST_API_TOKEN or UPSTASH_*). Route "${routeKey}" using reduced per-instance cap (${reduced}/${requestedMax}). Configure distributed Redis for public scale.`
  );
  return reduced;
}

/**
 * Best-effort in-memory rate limit for serverless (per-instance). Prefer Upstash/Vercel KV in production at scale.
 * @returns null if allowed, or seconds until retry if blocked.
 */
export function rateLimitHit(
  routeKey: string,
  request: NextRequest,
  options: RateLimitOptions
): number | null {
  const max = effectiveMaxForRoute(routeKey, options.max);
  const k = keyForRequest(routeKey, request, options.uid);
  const now = Date.now();
  const b = buckets.get(k);
  if (!b || now >= b.resetAt) {
    buckets.set(k, { count: 1, resetAt: now + options.windowMs });
    return null;
  }
  if (b.count >= max) {
    return Math.ceil((b.resetAt - now) / 1000);
  }
  b.count += 1;
  return null;
}

/**
 * Distributed-capable limiter.
 * - Uses KV/Upstash REST when env vars are configured.
 * - Falls back to in-memory limiter for local/dev.
 * - In production without KV, caps are reduced and a console error is emitted once per process pattern.
 */
export async function rateLimitHitAsync(
  routeKey: string,
  request: NextRequest,
  options: RateLimitOptions
): Promise<number | null> {
  const max = effectiveMaxForRoute(routeKey, options.max);
  const opts = { ...options, max };
  const remote = await hitDistributedLimiter(routeKey, request, opts);
  if (remote != null) return remote;
  return rateLimitHit(routeKey, request, opts);
}

/** Returns 429 JSON if limited; otherwise null. */
export async function rateLimitResponseIfExceeded(
  routeKey: string,
  request: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const retry = await rateLimitHitAsync(routeKey, request, options);
  if (retry == null) return null;
  return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(retry) } });
}
