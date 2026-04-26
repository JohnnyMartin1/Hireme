import { NextRequest, NextResponse } from "next/server";
import { canManageCalendarIntegration, getServerAuthedUser } from "@/lib/server-auth";
import { buildMicrosoftAuthUrl } from "@/lib/integrations/microsoft-calendar";
import { adminDb } from "@/lib/firebase-admin";
import admin from "firebase-admin";

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
  const redirectPath = safeRedirectPath(redirectRaw, user.uid);
  const nonce = crypto.randomUUID();
  await adminDb.collection("oauthStates").doc(nonce).set({
    userId: user.uid,
    provider: "microsoft",
    redirectPath,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  const state = Buffer.from(JSON.stringify({ n: nonce, u: user.uid, p: "microsoft" })).toString("base64url");
  return { url: buildMicrosoftAuthUrl(state) };
}

export async function GET(request: NextRequest) {
  try {
    const started = await startOAuth(request, request.nextUrl.searchParams.get("redirect"));
    if ("error" in started) return started.error;
    return NextResponse.redirect(started.url);
  } catch (error) {
    console.error("GET /api/integrations/microsoft-calendar/connect", error);
    return NextResponse.json({ error: "Failed to start Microsoft OAuth" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const started = await startOAuth(request, body?.redirect ? String(body.redirect) : null);
    if ("error" in started) return started.error;
    return NextResponse.json({ url: started.url });
  } catch (error) {
    console.error("POST /api/integrations/microsoft-calendar/connect", error);
    return NextResponse.json({ error: "Failed to start Microsoft OAuth" }, { status: 500 });
  }
}
