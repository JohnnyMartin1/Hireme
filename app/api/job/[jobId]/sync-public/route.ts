import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canUserAccessJob } from "@/lib/matching/job-access";
import { syncPublicJobProjection } from "@/lib/server/public-projections";
import { isServerAdminUser } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const jobId = params.jobId;
    if (!jobId) {
      return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    }

    const jobSnap = await adminDb.collection("jobs").doc(jobId).get();
    if (!jobSnap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const job = jobSnap.data() as Record<string, unknown>;
    const viewerSnap = await adminDb.collection("users").doc(decoded.uid).get();
    const viewer = viewerSnap.data() as Record<string, unknown> | undefined;
    const viewerRole = String(viewer?.role || "");
    const ok =
      (await canUserAccessJob(adminDb, job, decoded.uid)) ||
      viewerRole === "ADMIN" ||
      isServerAdminUser(viewerRole, decoded.email);

    if (!ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await syncPublicJobProjection(adminDb, jobId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/job/[jobId]/sync-public", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
