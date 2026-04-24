import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authorizeTalentPoolsRequest } from "@/lib/talent-pool-server";

export const dynamic = "force-dynamic";

/** Recent pool membership activity + pools for dashboard CRM strip. */
export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeTalentPoolsRequest(request);
    if ("error" in auth) return auth.error;

    const recentSnap = await adminDb
      .collection("talentPoolMembers")
      .where("companyId", "==", auth.companyId)
      .orderBy("addedAt", "desc")
      .limit(8)
      .get();

    const recent = recentSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const poolsSnap = await adminDb.collection("talentPools").where("companyId", "==", auth.companyId).limit(24).get();

    const pools = poolsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => {
        const ad = a?.updatedAt?.toDate ? a.updatedAt.toDate() : a?.updatedAt || a?.createdAt || 0;
        const bd = b?.updatedAt?.toDate ? b.updatedAt.toDate() : b?.updatedAt || b?.createdAt || 0;
        return new Date(bd).getTime() - new Date(ad).getTime();
      })
      .slice(0, 12);

    return NextResponse.json({ recent, pools });
  } catch (e) {
    console.error("GET /api/talent-pools/activity", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
