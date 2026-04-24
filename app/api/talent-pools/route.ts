import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "firebase-admin";
import { authorizeTalentPoolsRequest } from "@/lib/talent-pool-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeTalentPoolsRequest(request);
    if ("error" in auth) return auth.error;

    const snap = await adminDb
      .collection("talentPools")
      .where("companyId", "==", auth.companyId)
      .get();

    const pools = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const withCounts = await Promise.all(
      pools.map(async (p: any) => {
        const c = await adminDb
          .collection("talentPoolMembers")
          .where("poolId", "==", p.id)
          .where("companyId", "==", auth.companyId)
          .count()
          .get();
        return { ...p, memberCount: c.data().count };
      })
    );

    withCounts.sort((a: any, b: any) => {
      const ad = a?.updatedAt?.toDate ? a.updatedAt.toDate() : a?.updatedAt || a?.createdAt || 0;
      const bd = b?.updatedAt?.toDate ? b.updatedAt.toDate() : b?.updatedAt || b?.createdAt || 0;
      return new Date(bd).getTime() - new Date(ad).getTime();
    });

    return NextResponse.json({ pools: withCounts });
  } catch (e) {
    console.error("GET /api/talent-pools", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeTalentPoolsRequest(request);
    if ("error" in auth) return auth.error;

    const body = await request.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const description = String(body?.description || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const ref = await adminDb.collection("talentPools").add({
      companyId: auth.companyId,
      name,
      description: description || "",
      createdByUserId: auth.decoded.uid,
      createdAt: now,
      updatedAt: now,
    });
    const fresh = await ref.get();
    return NextResponse.json({ pool: { id: fresh.id, ...fresh.data() } });
  } catch (e) {
    console.error("POST /api/talent-pools", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
