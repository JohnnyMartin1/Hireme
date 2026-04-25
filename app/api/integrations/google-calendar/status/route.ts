import { NextRequest, NextResponse } from "next/server";
import { canManageCalendarIntegration, getServerAuthedUser } from "@/lib/server-auth";
import { getGoogleCalendarIntegration } from "@/lib/integrations/google-calendar";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerAuthedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageCalendarIntegration(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const integration = await getGoogleCalendarIntegration(user.uid);
    const connected = Boolean(integration && integration.status === "CONNECTED" && integration.refreshToken);
    return NextResponse.json({
      connected,
      provider: "google",
      status: integration?.status || "DISCONNECTED",
      connectedEmail: integration?.connectedEmail || null,
    });
  } catch (error) {
    console.error("GET /api/integrations/google-calendar/status", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
