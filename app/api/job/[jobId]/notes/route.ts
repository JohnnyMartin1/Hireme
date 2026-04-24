import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canUserAccessJob } from "@/lib/matching/job-access";
import admin from "firebase-admin";

export const dynamic = "force-dynamic";

async function authorizeJobAccess(request: NextRequest, jobId: string) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const decoded = await adminAuth.verifyIdToken(token);
  const jobSnap = await adminDb.collection("jobs").doc(jobId).get();
  if (!jobSnap.exists) {
    return { error: NextResponse.json({ error: "Job not found" }, { status: 404 }) };
  }

  const jobData = jobSnap.data() as Record<string, unknown>;
  const ok = await canUserAccessJob(adminDb, jobData, decoded.uid);
  if (!ok) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { decoded };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    if (!jobId) return NextResponse.json({ error: "Missing job id" }, { status: 400 });

    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;

    const candidateId = request.nextUrl.searchParams.get("candidateId");
    if (!candidateId) {
      return NextResponse.json({ error: "Missing candidateId" }, { status: 400 });
    }

    const notesSnap = await adminDb
      .collection("recruiterNotes")
      .where("jobId", "==", jobId)
      .where("candidateId", "==", candidateId)
      .get();

    const notes = notesSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => {
        const aRaw = a?.updatedAt || a?.createdAt || null;
        const bRaw = b?.updatedAt || b?.createdAt || null;
        const aDate = aRaw?.toDate ? aRaw.toDate() : aRaw ? new Date(aRaw) : null;
        const bDate = bRaw?.toDate ? bRaw.toDate() : bRaw ? new Date(bRaw) : null;
        return (bDate?.getTime?.() || 0) - (aDate?.getTime?.() || 0);
      });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("GET /api/job/[jobId]/notes", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    if (!jobId) return NextResponse.json({ error: "Missing job id" }, { status: 400 });

    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const candidateId = String(body?.candidateId || "");
    const noteBody = String(body?.body || "").trim();
    const pipelineEntryId = body?.pipelineEntryId ? String(body.pipelineEntryId) : null;
    if (!candidateId) return NextResponse.json({ error: "Missing candidateId" }, { status: 400 });
    if (!noteBody) return NextResponse.json({ error: "Note body is required" }, { status: 400 });

    const payload = {
      jobId,
      candidateId,
      pipelineEntryId,
      authorUserId: auth.decoded!.uid,
      body: noteBody,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await adminDb.collection("recruiterNotes").add(payload);
    const snap = await docRef.get();

    return NextResponse.json({ note: { id: snap.id, ...snap.data() } });
  } catch (error) {
    console.error("POST /api/job/[jobId]/notes", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    if (!jobId) return NextResponse.json({ error: "Missing job id" }, { status: 400 });

    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const noteId = String(body?.noteId || "");
    const noteBody = String(body?.body || "").trim();
    if (!noteId) return NextResponse.json({ error: "Missing noteId" }, { status: 400 });
    if (!noteBody) return NextResponse.json({ error: "Note body is required" }, { status: 400 });

    const noteRef = adminDb.collection("recruiterNotes").doc(noteId);
    const snap = await noteRef.get();
    if (!snap.exists) return NextResponse.json({ error: "Note not found" }, { status: 404 });
    const existing = snap.data() as Record<string, unknown>;
    if (String(existing.jobId || "") !== jobId) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    if (String(existing.authorUserId || "") !== auth.decoded!.uid) {
      return NextResponse.json({ error: "You can only edit your own note" }, { status: 403 });
    }

    await noteRef.set(
      {
        body: noteBody,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const updated = await noteRef.get();
    return NextResponse.json({ note: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error("PATCH /api/job/[jobId]/notes", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    if (!jobId) return NextResponse.json({ error: "Missing job id" }, { status: 400 });

    const auth = await authorizeJobAccess(request, jobId);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const noteId = String(body?.noteId || "");
    if (!noteId) return NextResponse.json({ error: "Missing noteId" }, { status: 400 });

    const noteRef = adminDb.collection("recruiterNotes").doc(noteId);
    const snap = await noteRef.get();
    if (!snap.exists) return NextResponse.json({ error: "Note not found" }, { status: 404 });
    const existing = snap.data() as Record<string, unknown>;
    if (String(existing.jobId || "") !== jobId) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    if (String(existing.authorUserId || "") !== auth.decoded!.uid) {
      return NextResponse.json({ error: "You can only delete your own note" }, { status: 403 });
    }

    await noteRef.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/job/[jobId]/notes", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
