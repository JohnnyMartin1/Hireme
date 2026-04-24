import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canUserAccessJob } from "@/lib/matching/job-access";
import admin from "firebase-admin";

export const dynamic = "force-dynamic";

type CriterionPayload = {
  id?: string;
  label?: string;
  description?: string;
  weight?: number | null;
  priority?: number | null;
  order?: number;
  active?: boolean;
};

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

function normalizeCriteria(input: CriterionPayload[]): CriterionPayload[] {
  return input
    .map((item, index) => ({
      id: String(item?.id || ""),
      label: String(item?.label || "").trim(),
      description: String(item?.description || "").trim(),
      weight: item?.weight == null ? null : Number(item.weight),
      priority: item?.priority == null ? null : Number(item.priority),
      order: Number.isFinite(Number(item?.order)) ? Number(item?.order) : index,
      active: item?.active !== false,
    }))
    .filter((item) => item.label.length > 0);
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

    const snap = await adminDb
      .collection("jobs")
      .doc(jobId)
      .collection("evaluationCriteria")
      .get();

    const criteria = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => Number(a.order || 0) - Number(b.order || 0));

    return NextResponse.json({ criteria });
  } catch (error) {
    console.error("GET /api/job/[jobId]/evaluation-criteria", error);
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
    const incoming = Array.isArray(body?.criteria) ? (body.criteria as CriterionPayload[]) : [];
    const criteria = normalizeCriteria(incoming);

    const collectionRef = adminDb.collection("jobs").doc(jobId).collection("evaluationCriteria");
    const existingSnap = await collectionRef.get();
    const existingIds = new Set(existingSnap.docs.map((d) => d.id));
    const keepIds = new Set<string>();

    const batch = adminDb.batch();
    criteria.forEach((criterion, index) => {
      const id = criterion.id || collectionRef.doc().id;
      keepIds.add(id);
      const docRef = collectionRef.doc(id);
      batch.set(
        docRef,
        {
          label: criterion.label,
          description: criterion.description || "",
          weight: criterion.weight == null ? null : criterion.weight,
          priority: criterion.priority == null ? null : criterion.priority,
          order: Number.isFinite(Number(criterion.order)) ? Number(criterion.order) : index,
          active: criterion.active !== false,
          updatedByUserId: auth.decoded!.uid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    for (const oldId of existingIds) {
      if (keepIds.has(oldId)) continue;
      const docRef = collectionRef.doc(oldId);
      batch.set(
        docRef,
        {
          active: false,
          updatedByUserId: auth.decoded!.uid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    await batch.commit();

    const fresh = await collectionRef.get();
    const output = fresh.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => Number(a.order || 0) - Number(b.order || 0));
    return NextResponse.json({ criteria: output });
  } catch (error) {
    console.error("POST /api/job/[jobId]/evaluation-criteria", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
