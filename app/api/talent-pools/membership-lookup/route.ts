import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authorizeTalentPoolsRequest } from "@/lib/talent-pool-server";

export const dynamic = "force-dynamic";

type PoolBadge = { poolId: string; poolName: string; tags?: string[] };

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Batch lookup: which talent pools each candidate appears in (same company). */
export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeTalentPoolsRequest(request);
    if ("error" in auth) return auth.error;

    const body = await request.json().catch(() => ({}));
    const rawIds = Array.isArray(body?.candidateIds) ? body.candidateIds : [];
    const candidateIds = [...new Set(rawIds.map((id: unknown) => String(id || "").trim()).filter(Boolean))].slice(0, 120);
    if (!candidateIds.length) {
      return NextResponse.json({ byCandidate: {} as Record<string, PoolBadge[]> });
    }

    const byCandidate: Record<string, PoolBadge[]> = {};
    const poolIdSet = new Set<string>();

    for (const group of chunk(candidateIds, 10)) {
      const snap = await adminDb
        .collection("talentPoolMembers")
        .where("companyId", "==", auth.companyId)
        .where("candidateId", "in", group)
        .get();

      for (const d of snap.docs) {
        const row = d.data() as Record<string, unknown>;
        const cid = String(row.candidateId || "");
        const pid = String(row.poolId || "");
        if (!cid || !pid) continue;
        poolIdSet.add(pid);
        const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
        if (!byCandidate[cid]) byCandidate[cid] = [];
        byCandidate[cid].push({ poolId: pid, poolName: pid, tags });
      }
    }

    const poolIds = [...poolIdSet];
    const refs = poolIds.map((id) => adminDb.collection("talentPools").doc(id));
    const poolSnaps = refs.length ? await adminDb.getAll(...refs) : [];
    const poolNameById = new Map<string, string>();
    for (const s of poolSnaps) {
      if (s.exists) {
        const nm = String((s.data() as Record<string, unknown>)?.name || "Pool");
        poolNameById.set(s.id, nm);
      }
    }

    for (const cid of Object.keys(byCandidate)) {
      byCandidate[cid] = byCandidate[cid].map((b) => ({
        ...b,
        poolName: poolNameById.get(b.poolId) || b.poolName,
      }));
    }

    return NextResponse.json({ byCandidate });
  } catch (e) {
    console.error("POST /api/talent-pools/membership-lookup", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
