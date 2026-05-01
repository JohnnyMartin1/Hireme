import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { syncPublicCandidateProfile } from "@/lib/server/public-projections";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const snap = await adminDb.collection("users").doc(decoded.uid).get();
    const role = String(snap.data()?.role || "");
    if (role !== "JOB_SEEKER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await syncPublicCandidateProfile(adminDb, decoded.uid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/auth/sync-public-candidate-profile", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
