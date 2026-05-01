import { NextRequest, NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { isServerAdminUser } from "@/lib/admin-access";
import { syncPublicCandidateProfile } from "@/lib/server/public-projections";

export const dynamic = "force-dynamic";

const BATCH = 200;

/** One-shot admin backfill: users(role==JOB_SEEKER) → publicCandidateProfiles. */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const adminSnap = await adminDb.collection("users").doc(decoded.uid).get();
    const adminData = adminSnap.data();
    if (!isServerAdminUser(adminData?.role as string | undefined, decoded.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const startAfter = typeof body.startAfter === "string" ? body.startAfter : undefined;

    let q = adminDb
      .collection("users")
      .where("role", "==", "JOB_SEEKER")
      .orderBy(FieldPath.documentId())
      .limit(BATCH);
    if (startAfter) {
      const cursor = await adminDb.collection("users").doc(startAfter).get();
      if (cursor.exists) q = q.startAfter(cursor);
    }

    const snap = await q.get();
    let synced = 0;
    for (const d of snap.docs) {
      await syncPublicCandidateProfile(adminDb, d.id);
      synced += 1;
    }

    const lastId = snap.docs.length ? snap.docs[snap.docs.length - 1].id : null;
    return NextResponse.json({
      ok: true,
      synced,
      nextStartAfter: snap.docs.length === BATCH ? lastId : null,
    });
  } catch (e) {
    console.error("POST /api/admin/bootstrap-public-candidate-profiles", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
