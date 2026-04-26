import { NextRequest, NextResponse } from "next/server";
import { canManageCalendarIntegration, getServerAuthedUser } from "@/lib/server-auth";
import { getMicrosoftCalendarIntegration } from "@/lib/integrations/microsoft-calendar";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerAuthedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageCalendarIntegration(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const integration = await getMicrosoftCalendarIntegration(user.uid);
    const connected = Boolean(integration && integration.status === "CONNECTED");
    const syncReady = Boolean(connected && (integration?.refreshToken || integration?.accessToken));
    return NextResponse.json({
      connected,
      provider: "microsoft",
      status: integration?.status || "DISCONNECTED",
      connectedEmail: integration?.connectedEmail || null,
      syncReady,
    });
  } catch (error) {
    console.error("GET /api/integrations/microsoft-calendar/status", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
