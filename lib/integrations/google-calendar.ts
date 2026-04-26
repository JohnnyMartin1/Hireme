import { google } from "googleapis";
import { adminDb } from "@/lib/firebase-admin";
import admin from "firebase-admin";

export type CalendarIntegrationStatus = "CONNECTED" | "DISCONNECTED" | "ERROR";

export type GoogleCalendarIntegrationDoc = {
  userId: string;
  provider: "google";
  connectedEmail?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiryDate?: number | null;
  scope?: string | null;
  status: CalendarIntegrationStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "";
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth env vars are missing");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function buildGoogleAuthUrl(state: string) {
  const client = getGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = getGoogleOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

function integrationDocRef(userId: string) {
  return adminDb.collection("calendarIntegrations").doc(`google_${userId}`);
}

export async function getGoogleCalendarIntegration(userId: string) {
  const snap = await integrationDocRef(userId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as GoogleCalendarIntegrationDoc) };
}

export async function upsertGoogleCalendarIntegration(
  userId: string,
  fields: Partial<GoogleCalendarIntegrationDoc>
) {
  // TODO: encrypt OAuth tokens before production hardening.
  await integrationDocRef(userId).set(
    {
      userId,
      provider: "google",
      status: "CONNECTED",
      ...fields,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function disconnectGoogleCalendarIntegration(userId: string) {
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

export async function getAuthorizedGoogleClient(userId: string) {
  const integration = await getGoogleCalendarIntegration(userId);
  if (!integration || integration.status !== "CONNECTED") {
    throw new Error("Google Calendar not connected");
  }
  const client = getGoogleOAuthClient();
  client.setCredentials({
    access_token: integration.accessToken || undefined,
    refresh_token: integration.refreshToken || undefined,
    expiry_date: integration.expiryDate || undefined,
  });
  client.on("tokens", async (tokens) => {
    await upsertGoogleCalendarIntegration(userId, {
      accessToken: tokens.access_token || integration.accessToken || null,
      refreshToken: tokens.refresh_token || integration.refreshToken || null,
      expiryDate: tokens.expiry_date || integration.expiryDate || null,
      scope: tokens.scope || integration.scope || null,
    });
  });
  return { client, integration };
}

type CreateEventParams = {
  organizerUserId: string;
  title: string;
  description?: string | null;
  scheduledAtIso: string;
  durationMinutes: number;
  timezone: string;
  location?: string | null;
  attendees?: Array<{ email: string }>;
};

export async function createGoogleCalendarInterviewEvent(params: CreateEventParams) {
  const { client } = await getAuthorizedGoogleClient(params.organizerUserId);
  const calendar = google.calendar({ version: "v3", auth: client });
  const startDate = new Date(params.scheduledAtIso);
  const endDate = new Date(startDate.getTime() + Math.max(15, params.durationMinutes) * 60 * 1000);
  const response = await calendar.events.insert({
    calendarId: "primary",
    sendUpdates: "all",
    requestBody: {
      summary: params.title,
      description: params.description || undefined,
      location: params.location || undefined,
      start: { dateTime: startDate.toISOString(), timeZone: params.timezone || "UTC" },
      end: { dateTime: endDate.toISOString(), timeZone: params.timezone || "UTC" },
      attendees: (params.attendees || []).length > 0 ? params.attendees : undefined,
    },
  });
  return response.data;
}

type UpdateEventParams = Omit<CreateEventParams, "attendees"> & {
  eventId: string;
  attendees?: Array<{ email: string }>;
};

export async function updateGoogleCalendarInterviewEvent(params: UpdateEventParams) {
  const { client } = await getAuthorizedGoogleClient(params.organizerUserId);
  const calendar = google.calendar({ version: "v3", auth: client });
  const startDate = new Date(params.scheduledAtIso);
  const endDate = new Date(startDate.getTime() + Math.max(15, params.durationMinutes) * 60 * 1000);
  const response = await calendar.events.patch({
    calendarId: "primary",
    eventId: params.eventId,
    sendUpdates: "all",
    requestBody: {
      summary: params.title,
      description: params.description || undefined,
      location: params.location || undefined,
      start: { dateTime: startDate.toISOString(), timeZone: params.timezone || "UTC" },
      end: { dateTime: endDate.toISOString(), timeZone: params.timezone || "UTC" },
      attendees: (params.attendees || []).length > 0 ? params.attendees : undefined,
    },
  });
  return response.data;
}

export async function cancelGoogleCalendarInterviewEvent(params: {
  organizerUserId: string;
  eventId: string;
}) {
  const { client } = await getAuthorizedGoogleClient(params.organizerUserId);
  const calendar = google.calendar({ version: "v3", auth: client });
  await calendar.events.patch({
    calendarId: "primary",
    eventId: params.eventId,
    sendUpdates: "all",
    requestBody: { status: "cancelled" },
  });
}
