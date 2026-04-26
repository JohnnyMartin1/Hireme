import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "firebase-admin";
import {
  exchangeMicrosoftCodeForTokens,
  getMicrosoftConnectedEmailFromGraph,
  upsertMicrosoftCalendarIntegration,
} from "@/lib/integrations/microsoft-calendar";

export const dynamic = "force-dynamic";

function buildCalendarErrorRedirect(request: NextRequest, userId: string, reason: string) {
  return NextResponse.redirect(
    new URL(
      `/account/${userId}/settings?calendarError=${encodeURIComponent(reason)}&calendarProvider=microsoft#calendar`,
      request.url
    )
  );
}

function decodeState(value: string | null): { n: string; u: string; p: string } | null {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateRaw = request.nextUrl.searchParams.get("state");
  const state = decodeState(stateRaw);
  if (!code || !state?.n || !state?.u || state.p !== "microsoft") {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  try {
    const stateRef = adminDb.collection("oauthStates").doc(state.n);
    const stateSnap = await stateRef.get();
    if (!stateSnap.exists) return NextResponse.redirect(new URL("/auth/login", request.url));
    const stateData = stateSnap.data() as Record<string, unknown>;
    if (String(stateData.userId || "") !== state.u) return NextResponse.redirect(new URL("/auth/login", request.url));
    const expiresAt = Number(stateData.expiresAt || 0);
    if (!expiresAt || expiresAt < Date.now()) {
      await stateRef.delete().catch(() => {});
      return buildCalendarErrorRedirect(request, state.u, "oauth_state_expired");
    }
    const tokens = await exchangeMicrosoftCodeForTokens(code);
    const accessToken = String(tokens.access_token || "");
    const connectedEmail = accessToken ? await getMicrosoftConnectedEmailFromGraph(accessToken) : null;
    await upsertMicrosoftCalendarIntegration(state.u, {
      connectedEmail,
      accessToken: accessToken || null,
      refreshToken: tokens.refresh_token || null,
      expiryDate: tokens.expires_in ? Date.now() + Number(tokens.expires_in) * 1000 : null,
      scope: tokens.scope || null,
      status: "CONNECTED",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await stateRef.delete().catch(() => {});
    const redirectPath = String(stateData.redirectPath || `/account/${state.u}/settings#calendar`);
    return NextResponse.redirect(new URL(redirectPath, request.url));
  } catch (error) {
    console.error("GET /api/integrations/microsoft-calendar/callback", error);
    try {
      await adminDb.collection("calendarIntegrations").doc(`microsoft_${state.u}`).set(
        {
          userId: state.u,
          provider: "microsoft",
          status: "ERROR",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch {
      // ignore
    }
    return buildCalendarErrorRedirect(request, state.u, "oauth_callback_failed");
  }
}
