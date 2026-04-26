import {
  cancelGoogleCalendarInterviewEvent,
  createGoogleCalendarInterviewEvent,
  getGoogleCalendarIntegration,
  updateGoogleCalendarInterviewEvent,
} from "@/lib/integrations/google-calendar";
import {
  cancelMicrosoftCalendarInterviewEvent,
  createMicrosoftCalendarInterviewEvent,
  getMicrosoftCalendarIntegration,
  updateMicrosoftCalendarInterviewEvent,
} from "@/lib/integrations/microsoft-calendar";

export type CalendarProvider = "google" | "microsoft";

type CommonCalendarParams = {
  organizerUserId: string;
  title: string;
  description?: string | null;
  scheduledAtIso: string;
  durationMinutes: number;
  timezone: string;
  location?: string | null;
  attendees?: Array<{ email: string }>;
};

function isSyncReady(integration: any) {
  if (!integration || integration.status !== "CONNECTED") return false;
  return Boolean(integration.refreshToken || integration.accessToken);
}

export async function getConnectedCalendarProvider(
  userId: string,
  preferredProvider?: CalendarProvider | null
): Promise<CalendarProvider | null> {
  const [google, microsoft] = await Promise.all([
    getGoogleCalendarIntegration(userId),
    getMicrosoftCalendarIntegration(userId),
  ]);
  if (preferredProvider === "google" && isSyncReady(google)) return "google";
  if (preferredProvider === "microsoft" && isSyncReady(microsoft)) return "microsoft";
  if (isSyncReady(google)) return "google";
  if (isSyncReady(microsoft)) return "microsoft";
  return null;
}

export async function createCalendarInterviewEvent(
  provider: CalendarProvider,
  params: CommonCalendarParams
) {
  if (provider === "google") {
    const event = await createGoogleCalendarInterviewEvent(params);
    return { id: event.id || null, htmlLink: event.htmlLink || null };
  }
  const event = await createMicrosoftCalendarInterviewEvent(params);
  return { id: event.id || null, htmlLink: event.webLink || null };
}

export async function updateCalendarInterviewEvent(
  provider: CalendarProvider,
  params: CommonCalendarParams & { eventId: string }
) {
  if (provider === "google") {
    const event = await updateGoogleCalendarInterviewEvent(params);
    return { id: event.id || null, htmlLink: event.htmlLink || null };
  }
  const event = await updateMicrosoftCalendarInterviewEvent(params);
  return { id: event.id || null, htmlLink: event.webLink || null };
}

export async function cancelCalendarInterviewEvent(
  provider: CalendarProvider,
  params: { organizerUserId: string; eventId: string }
) {
  if (provider === "google") return cancelGoogleCalendarInterviewEvent(params);
  return cancelMicrosoftCalendarInterviewEvent(params);
}
