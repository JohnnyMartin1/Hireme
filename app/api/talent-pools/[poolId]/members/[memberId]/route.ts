import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "firebase-admin";
import { assertPoolInCompany, authorizeTalentPoolsRequest } from "@/lib/talent-pool-server";

export const dynamic = "force-dynamic";

function normalizeTags(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];
  return value
    .map((t) => String(t || "").trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { poolId: string; memberId: string } }
) {
  try {
    const auth = await authorizeTalentPoolsRequest(request);
    if ("error" in auth) return auth.error;
    const { poolId, memberId } = params;
    if (!poolId || !memberId) {
      return NextResponse.json({ error: "Missing ids" }, { status: 400 });
    }

    const ok = await assertPoolInCompany(poolId, auth.companyId);
    if ("error" in ok) return ok.error;

    const ref = adminDb.collection("talentPoolMembers").doc(memberId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    const row = snap.data() as Record<string, unknown>;
    if (String(row.poolId || "") !== poolId || String(row.companyId || "") !== auth.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};
    if (body?.notes !== undefined) updates.notes = String(body.notes || "").trim().slice(0, 500);
    if (body?.tags !== undefined) updates.tags = normalizeTags(body.tags) ?? [];
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates" }, { status: 400 });
    }
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await ref.set(updates, { merge: true });
    await adminDb.collection("talentPools").doc(poolId).set({ updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

    const fresh = await ref.get();
    return NextResponse.json({ member: { id: fresh.id, ...fresh.data() } });
  } catch (e) {
    console.error("PATCH /api/talent-pools/.../members/[memberId]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { poolId: string; memberId: string } }
) {
  try {
    const auth = await authorizeTalentPoolsRequest(request);
    if ("error" in auth) return auth.error;
    const { poolId, memberId } = params;
    if (!poolId || !memberId) {
      return NextResponse.json({ error: "Missing ids" }, { status: 400 });
    }

    const ok = await assertPoolInCompany(poolId, auth.companyId);
    if ("error" in ok) return ok.error;

    const ref = adminDb.collection("talentPoolMembers").doc(memberId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    const row = snap.data() as Record<string, unknown>;
    if (String(row.poolId || "") !== poolId || String(row.companyId || "") !== auth.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ref.delete();
    await adminDb
      .collection("talentPools")
      .doc(poolId)
      .set({ updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/talent-pools/.../members/[memberId]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
