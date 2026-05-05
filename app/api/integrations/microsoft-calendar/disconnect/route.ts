import { NextRequest, NextResponse } from "next/server";
import { rateLimitResponseIfExceeded } from "@/lib/api-rate-limit";
import { canManageCalendarIntegration, getServerAuthedUser } from "@/lib/server-auth";
import { disconnectMicrosoftCalendarIntegration } from "@/lib/integrations/microsoft-calendar";
import { writeAuditLog } from "@/lib/server/audit-log";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getServerAuthedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageCalendarIntegration(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const rl = await rateLimitResponseIfExceeded("calendar-microsoft-disconnect", request, {
      windowMs: 60 * 60 * 1000,
      max: 20,
      uid: user.uid,
    });
    if (rl) return rl;
    await disconnectMicrosoftCalendarIntegration(user.uid);
    await writeAuditLog({
      eventType: "calendar.microsoft.disconnect",
      outcome: "success",
      actorUserId: user.uid,
      actorRole: user.role,
      request,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/integrations/microsoft-calendar/disconnect", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
