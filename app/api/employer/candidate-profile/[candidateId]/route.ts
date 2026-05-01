import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { stripCandidateUserForEmployerResponse } from "@/lib/server/strip-candidate-for-employer";
import { isServerAdminUser } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { candidateId: string } }
) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const candidateId = params.candidateId;
    if (!candidateId) {
      return NextResponse.json({ error: "Missing candidate id" }, { status: 400 });
    }

    const viewerSnap = await adminDb.collection("users").doc(decoded.uid).get();
    const viewer = viewerSnap.data() as Record<string, unknown> | undefined;
    const viewerRole = String(viewer?.role || "");
    const allowed =
      viewerRole === "EMPLOYER" ||
      viewerRole === "RECRUITER" ||
      viewerRole === "ADMIN" ||
      isServerAdminUser(viewerRole, decoded.email);

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const candSnap = await adminDb.collection("users").doc(candidateId).get();
    if (!candSnap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const raw = candSnap.data() as Record<string, unknown>;
    if (String(raw.role || "") !== "JOB_SEEKER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profile = stripCandidateUserForEmployerResponse({ ...raw, id: candSnap.id });
    return NextResponse.json({ profile });
  } catch (e) {
    console.error("GET /api/employer/candidate-profile/[candidateId]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
