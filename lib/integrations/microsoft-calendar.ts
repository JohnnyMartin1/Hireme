import { adminDb } from "@/lib/firebase-admin";
import admin from "firebase-admin";

export type MicrosoftCalendarIntegrationDoc = {
  userId: string;
  provider: "microsoft";
  connectedEmail?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiryDate?: number | null;
  scope?: string | null;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  createdAt?: unknown;
  updatedAt?: unknown;
};

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function integrationDocRef(userId: string) {
  return adminDb.collection("calendarIntegrations").doc(`microsoft_${userId}`);
}

export function getMicrosoftTenantId() {
  return process.env.MICROSOFT_TENANT_ID || "common";
}

export function buildMicrosoftAuthUrl(state: string) {
  const tenant = getMicrosoftTenantId();
  const clientId = requireEnv("MICROSOFT_CLIENT_ID");
  const redirectUri = requireEnv("MICROSOFT_REDIRECT_URI");
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: "offline_access openid profile email Calendars.ReadWrite",
    state,
  });
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
}

async function tokenRequest(body: URLSearchParams) {
  const tenant = getMicrosoftTenantId();
  const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(String((payload as any)?.error_description || (payload as any)?.error || "Microsoft token exchange failed"));
  }
  return payload as any;
}

export async function exchangeMicrosoftCodeForTokens(code: string) {
  const body = new URLSearchParams({
    client_id: requireEnv("MICROSOFT_CLIENT_ID"),
    client_secret: requireEnv("MICROSOFT_CLIENT_SECRET"),
    redirect_uri: requireEnv("MICROSOFT_REDIRECT_URI"),
    grant_type: "authorization_code",
    code,
  });
  return tokenRequest(body);
}

export async function getMicrosoftCalendarIntegration(userId: string) {
  const snap = await integrationDocRef(userId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as MicrosoftCalendarIntegrationDoc) };
}

export async function upsertMicrosoftCalendarIntegration(
  userId: string,
  fields: Partial<MicrosoftCalendarIntegrationDoc>
) {
  await integrationDocRef(userId).set(
    {
      userId,
      provider: "microsoft",
      status: "CONNECTED",
      ...fields,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function disconnectMicrosoftCalendarIntegration(userId: string) {
  await integrationDocRef(userId).set(
    {
      status: "DISCONNECTED",
      accessToken: null,
      refreshToken: null,
      expiryDate: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function refreshMicrosoftAccessToken(userId: string, refreshToken: string) {
  const body = new URLSearchParams({
    client_id: requireEnv("MICROSOFT_CLIENT_ID"),
    client_secret: requireEnv("MICROSOFT_CLIENT_SECRET"),
    redirect_uri: requireEnv("MICROSOFT_REDIRECT_URI"),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const payload = await tokenRequest(body);
  await upsertMicrosoftCalendarIntegration(userId, {
    accessToken: payload.access_token || null,
    refreshToken: payload.refresh_token || refreshToken || null,
    expiryDate: payload.expires_in ? Date.now() + Number(payload.expires_in) * 1000 : null,
    scope: payload.scope || null,
  });
  return String(payload.access_token || "");
}

export async function getMicrosoftAccessToken(userId: string) {
  const integration = await getMicrosoftCalendarIntegration(userId);
  if (!integration || integration.status !== "CONNECTED") {
    throw new Error("Microsoft Calendar not connected");
  }
  const accessToken = String(integration.accessToken || "");
  const refreshToken = String(integration.refreshToken || "");
  const expiryDate = Number(integration.expiryDate || 0);
  const expiresSoon = expiryDate > 0 && expiryDate < Date.now() + 60_000;
  if (accessToken && !expiresSoon) return accessToken;
  if (!refreshToken) throw new Error("Microsoft calendar token refresh unavailable");
  return refreshMicrosoftAccessToken(userId, refreshToken);
}

export async function getMicrosoftConnectedEmailFromGraph(accessToken: string) {
  const res = await fetch(`${GRAPH_BASE}/me?$select=mail,userPrincipalName`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return String((payload as any)?.mail || (payload as any)?.userPrincipalName || "") || null;
}

type MicrosoftAttendee = { email: string };

type CalendarEventParams = {
  organizerUserId: string;
  title: string;
  description?: string | null;
  scheduledAtIso: string;
  durationMinutes: number;
  timezone: string;
  location?: string | null;
  attendees?: MicrosoftAttendee[];
};

function toGraphDateTime(iso: string, timezone: string) {
  const d = new Date(iso);
  const dateTime = Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  return { dateTime, timeZone: timezone || "UTC" };
}

function toGraphAttendees(attendees?: MicrosoftAttendee[]) {
  if (!attendees || attendees.length === 0) return undefined;
  return attendees.map((a) => ({
    type: "required",
    emailAddress: { address: a.email },
  }));
}

export async function createMicrosoftCalendarInterviewEvent(params: CalendarEventParams) {
  const accessToken = await getMicrosoftAccessToken(params.organizerUserId);
  const start = toGraphDateTime(params.scheduledAtIso, params.timezone);
  const end = toGraphDateTime(
    new Date(new Date(params.scheduledAtIso).getTime() + Math.max(15, params.durationMinutes) * 60 * 1000).toISOString(),
    params.timezone
  );
  const res = await fetch(`${GRAPH_BASE}/me/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: params.title,
      body: params.description
        ? { contentType: "Text", content: params.description }
        : undefined,
      location: params.location ? { displayName: params.location } : undefined,
      start,
      end,
      attendees: toGraphAttendees(params.attendees),
    }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((payload as any)?.error?.message || "Microsoft event creation failed"));
  return payload as any;
}

export async function updateMicrosoftCalendarInterviewEvent(
  params: CalendarEventParams & { eventId: string }
) {
  const accessToken = await getMicrosoftAccessToken(params.organizerUserId);
  const start = toGraphDateTime(params.scheduledAtIso, params.timezone);
  const end = toGraphDateTime(
    new Date(new Date(params.scheduledAtIso).getTime() + Math.max(15, params.durationMinutes) * 60 * 1000).toISOString(),
    params.timezone
  );
  const res = await fetch(`${GRAPH_BASE}/me/events/${encodeURIComponent(params.eventId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: params.title,
      body: params.description
        ? { contentType: "Text", content: params.description }
        : undefined,
      location: params.location ? { displayName: params.location } : undefined,
      start,
      end,
      attendees: toGraphAttendees(params.attendees),
    }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(String((payload as any)?.error?.message || "Microsoft event update failed"));
  }
  const readBack = await fetch(`${GRAPH_BASE}/me/events/${encodeURIComponent(params.eventId)}?$select=id,webLink`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = await readBack.json().catch(() => ({}));
  return payload as any;
}

export async function cancelMicrosoftCalendarInterviewEvent(params: {
  organizerUserId: string;
  eventId: string;
}) {
  const accessToken = await getMicrosoftAccessToken(params.organizerUserId);
  const res = await fetch(`${GRAPH_BASE}/me/events/${encodeURIComponent(params.eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(String((payload as any)?.error?.message || "Microsoft event cancel failed"));
  }
}
