import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "firebase-admin";
import { assertPoolInCompany, authorizeTalentPoolsRequest, talentPoolMemberDocId } from "@/lib/talent-pool-server";

export const dynamic = "force-dynamic";

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((t) => String(t || "").trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { poolId: string } }
) {
  try {
    const auth = await authorizeTalentPoolsRequest(request);
    if ("error" in auth) return auth.error;
    const poolId = params.poolId;
    if (!poolId) return NextResponse.json({ error: "Missing pool id" }, { status: 400 });

    const ok = await assertPoolInCompany(poolId, auth.companyId);
    if ("error" in ok) return ok.error;

    const tag = request.nextUrl.searchParams.get("tag");
    let snap = await adminDb
      .collection("talentPoolMembers")
      .where("poolId", "==", poolId)
      .where("companyId", "==", auth.companyId)
      .get();

    let members = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (tag) {
      const t = tag.trim().toLowerCase();
      members = members.filter((m: any) => Array.isArray(m.tags) && m.tags.some((x: string) => String(x).toLowerCase() === t));
    }

    return NextResponse.json({ members });
  } catch (e) {
    console.error("GET /api/talent-pools/[poolId]/members", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { poolId: string } }
) {
  try {
    const auth = await authorizeTalentPoolsRequest(request);
    if ("error" in auth) return auth.error;
    const poolId = params.poolId;
    if (!poolId) return NextResponse.json({ error: "Missing pool id" }, { status: 400 });

    const ok = await assertPoolInCompany(poolId, auth.companyId);
    if ("error" in ok) return ok.error;

    const body = await request.json().catch(() => ({}));
    const candidateId = String(body?.candidateId || "").trim();
    const notes = String(body?.notes || "").trim().slice(0, 500);
    const tags = normalizeTags(body?.tags);
    if (!candidateId) {
      return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
    }

    const candSnap = await adminDb.collection("users").doc(candidateId).get();
    if (!candSnap.exists) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }
    const role = String((candSnap.data() as any)?.role || "");
    if (role !== "JOB_SEEKER") {
      return NextResponse.json({ error: "Invalid candidate" }, { status: 400 });
    }

    const memberId = talentPoolMemberDocId(poolId, candidateId);
    const now = admin.firestore.FieldValue.serverTimestamp();
    const payload = {
      poolId,
      companyId: auth.companyId,
      candidateId,
      addedByUserId: auth.decoded.uid,
      addedAt: now,
      notes: notes || "",
      tags,
    };

    await adminDb.collection("talentPoolMembers").doc(memberId).set(payload, { merge: true });

    await adminDb.collection("talentPools").doc(poolId).set({ updatedAt: now }, { merge: true });

    const fresh = await adminDb.collection("talentPoolMembers").doc(memberId).get();
    return NextResponse.json({ member: { id: fresh.id, ...fresh.data() } });
  } catch (e) {
    console.error("POST /api/talent-pools/[poolId]/members", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
