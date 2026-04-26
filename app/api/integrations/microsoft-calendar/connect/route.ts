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

export async function GET(request: NextRequest) {
  try {
    const user = await getServerAuthedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageCalendarIntegration(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const redirectPath = safeRedirectPath(request.nextUrl.searchParams.get("redirect"), user.uid);
    const nonce = crypto.randomUUID();
    await adminDb.collection("oauthStates").doc(nonce).set({
      userId: user.uid,
      provider: "microsoft",
      redirectPath,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    const state = Buffer.from(JSON.stringify({ n: nonce, u: user.uid, p: "microsoft" })).toString("base64url");
    return NextResponse.redirect(buildMicrosoftAuthUrl(state));
  } catch (error) {
    console.error("GET /api/integrations/microsoft-calendar/connect", error);
    return NextResponse.json({ error: "Failed to start Microsoft OAuth" }, { status: 500 });
  }
}
