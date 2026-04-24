import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "firebase-admin";
import { assertPoolInCompany, authorizeTalentPoolsRequest } from "@/lib/talent-pool-server";

export const dynamic = "force-dynamic";

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

    const membersSnap = await adminDb
      .collection("talentPoolMembers")
      .where("poolId", "==", poolId)
      .where("companyId", "==", auth.companyId)
      .get();

    const members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({
      pool: { id: ok.id, ...ok.data },
      members,
    });
  } catch (e) {
    console.error("GET /api/talent-pools/[poolId]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
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
    const updates: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (body?.name !== undefined) updates.name = String(body.name || "").trim();
    if (body?.description !== undefined) updates.description = String(body.description || "").trim();
    if (updates.name === "") {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }

    await adminDb.collection("talentPools").doc(poolId).set(updates, { merge: true });
    const fresh = await adminDb.collection("talentPools").doc(poolId).get();
    return NextResponse.json({ pool: { id: fresh.id, ...fresh.data() } });
  } catch (e) {
    console.error("PATCH /api/talent-pools/[poolId]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
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

    const membersSnap = await adminDb
      .collection("talentPoolMembers")
      .where("poolId", "==", poolId)
      .where("companyId", "==", auth.companyId)
      .get();

    let batch = adminDb.batch();
    let n = 0;
    for (const d of membersSnap.docs) {
      batch.delete(d.ref);
      n++;
      if (n >= 400) {
        await batch.commit();
        batch = adminDb.batch();
        n = 0;
      }
    }
    if (n > 0) await batch.commit();

    await adminDb.collection("talentPools").doc(poolId).delete();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/talent-pools/[poolId]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
