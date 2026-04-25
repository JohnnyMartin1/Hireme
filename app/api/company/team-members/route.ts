import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const meSnap = await adminDb.collection("users").doc(decoded.uid).get();
    const me = meSnap.data() as Record<string, unknown> | undefined;
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const role = String(me.role || "");
    const companyId = String(me.companyId || "");
    if (!companyId || (role !== "EMPLOYER" && role !== "RECRUITER" && role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const usersSnap = await adminDb.collection("users").where("companyId", "==", companyId).get();
    const members = usersSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Record<string, unknown>)
      .filter((u) => ["EMPLOYER", "RECRUITER", "ADMIN"].includes(String((u as any).role || "")))
      .map((u) => ({
        id: String((u as any).id),
        name: `${String((u as any).firstName || "")} ${String((u as any).lastName || "")}`.trim() || String((u as any).email || "Team member"),
        email: String((u as any).email || ""),
        role: String((u as any).role || ""),
        title: String((u as any).headline || ""),
      }));

    return NextResponse.json({ members });
  } catch (error) {
    console.error("GET /api/company/team-members", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
