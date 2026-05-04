import { NextRequest, NextResponse } from "next/server";
import { canManageCalendarIntegration, getServerAuthedUser } from "@/lib/server-auth";
import { buildGoogleAuthUrl } from "@/lib/integrations/google-calendar";
import { adminDb } from "@/lib/firebase-admin";
import admin from "firebase-admin";
import { rateLimitHitAsync } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

function safeRedirectPath(raw: string | null, uid: string) {
  if (!raw) return `/account/${uid}/settings#calendar`;
  if (!raw.startsWith("/")) return `/account/${uid}/settings#calendar`;
  if (raw.startsWith("//")) return `/account/${uid}/settings#calendar`;
  return raw;
}

async function startOAuth(request: NextRequest, redirectRaw: string | null) {
  const user = await getServerAuthedUser(request);
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!canManageCalendarIntegration(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const rl = await rateLimitHitAsync("oauth-google-connect", request, {
    windowMs: 60_000,
    max: 10,
    uid: user.uid,
  });
  if (rl != null) {
    return { error: NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl) } }) };
  }
  const redirectPath = safeRedirectPath(redirectRaw, user.uid);
  const nonce = crypto.randomUUID();
  console.info("google-calendar/connect: start oauth", {
    userId: user.uid,
    redirectPath,
    stateNonce: nonce,
  });
  await adminDb.collection("oauthStates").doc(nonce).set({
    userId: user.uid,
    provider: "google",
    redirectPath,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  const state = Buffer.from(JSON.stringify({ n: nonce, u: user.uid, p: "google" })).toString("base64url");
  return { url: buildGoogleAuthUrl(state) };
}

export async function GET(request: NextRequest) {
  try {
    const started = await startOAuth(request, request.nextUrl.searchParams.get("redirect"));
    if ("error" in started) return started.error;
    return NextResponse.redirect(started.url);
  } catch (error) {
    console.error("GET /api/integrations/google-calendar/connect", error);
    return NextResponse.json({ error: "Failed to start Google OAuth" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const started = await startOAuth(request, body?.redirect ? String(body.redirect) : null);
    if ("error" in started) return started.error;
    return NextResponse.json({ url: started.url });
  } catch (error) {
    console.error("POST /api/integrations/google-calendar/connect", error);
    return NextResponse.json({ error: "Failed to start Google OAuth" }, { status: 500 });
  }
}
