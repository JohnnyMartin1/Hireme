import { NextRequest, NextResponse } from "next/server";
import { canManageCalendarIntegration, getServerAuthedUser } from "@/lib/server-auth";
import { disconnectMicrosoftCalendarIntegration } from "@/lib/integrations/microsoft-calendar";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getServerAuthedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageCalendarIntegration(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await disconnectMicrosoftCalendarIntegration(user.uid);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/integrations/microsoft-calendar/disconnect", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
