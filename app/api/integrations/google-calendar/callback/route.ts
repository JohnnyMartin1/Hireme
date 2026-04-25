import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "firebase-admin";
import { exchangeCodeForTokens, upsertGoogleCalendarIntegration } from "@/lib/integrations/google-calendar";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

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
  if (!code || !state?.n || !state?.u || state.p !== "google") {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  try {
    const stateRef = adminDb.collection("oauthStates").doc(state.n);
    const stateSnap = await stateRef.get();
    if (!stateSnap.exists) return NextResponse.redirect(new URL("/auth/login", request.url));
    const stateData = stateSnap.data() as Record<string, unknown>;
    if (String(stateData.userId || "") !== state.u) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    const expiresAt = Number(stateData.expiresAt || 0);
    if (!expiresAt || expiresAt < Date.now()) {
      await stateRef.delete().catch(() => {});
      return NextResponse.redirect(new URL(`/account/${state.u}/settings#integrations`, request.url));
    }

    const tokens = await exchangeCodeForTokens(code);
    const oauth2 = new google.auth.OAuth2();
    oauth2.setCredentials(tokens);
    const me = await google.oauth2({ version: "v2", auth: oauth2 }).userinfo.get();
    const connectedEmail = me.data.email || null;
    await upsertGoogleCalendarIntegration(state.u, {
      connectedEmail,
      accessToken: tokens.access_token || null,
      refreshToken: tokens.refresh_token || null,
      expiryDate: tokens.expiry_date || null,
      scope: tokens.scope || null,
      status: "CONNECTED",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await stateRef.delete().catch(() => {});
    const redirectPath = String(stateData.redirectPath || `/account/${state.u}/settings#integrations`);
    return NextResponse.redirect(new URL(redirectPath, request.url));
  } catch (error) {
    console.error("GET /api/integrations/google-calendar/callback", error);
    try {
      await adminDb.collection("calendarIntegrations").doc(`google_${state.u}`).set(
        {
          userId: state.u,
          provider: "google",
          status: "ERROR",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch {
      // ignore
    }
    return NextResponse.redirect(new URL(`/account/${state.u}/settings#integrations`, request.url));
  }
}
