import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authorizeTalentPoolsRequest } from "@/lib/talent-pool-server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { candidateId: string } }
) {
  try {
    const auth = await authorizeTalentPoolsRequest(request);
    if ("error" in auth) return auth.error;

    const candidateId = params.candidateId;
    if (!candidateId) {
      return NextResponse.json({ error: "Missing candidate id" }, { status: 400 });
    }

    const snap = await adminDb
      .collection("talentPoolMembers")
      .where("companyId", "==", auth.companyId)
      .where("candidateId", "==", candidateId)
      .get();

    const poolIds = [...new Set(snap.docs.map((d) => String((d.data() as any).poolId || "")).filter(Boolean))];
    const poolNames = new Map<string, string>();
    await Promise.all(
      poolIds.map(async (pid) => {
        const p = await adminDb.collection("talentPools").doc(pid).get();
        if (p.exists) poolNames.set(pid, String((p.data() as any)?.name || "Pool"));
      })
    );

    const memberships = snap.docs.map((d) => {
      const row = d.data() as Record<string, unknown>;
      const pid = String(row.poolId || "");
      return {
        id: d.id,
        ...row,
        poolName: poolNames.get(pid) || "Pool",
      };
    });

    return NextResponse.json({ memberships });
  } catch (e) {
    console.error("GET /api/talent-pools/candidates/[candidateId]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
