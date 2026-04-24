import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { effectiveTalentCompanyId } from "@/lib/talent-pool-scope";

export type TalentAuth = {
  decoded: { uid: string };
  profile: Record<string, unknown>;
  companyId: string;
  role: string;
};

export async function authorizeTalentPoolsRequest(request: NextRequest): Promise<
  { error: NextResponse } | TalentAuth
> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const decoded = await adminAuth.verifyIdToken(token);
  const profileSnap = await adminDb.collection("users").doc(decoded.uid).get();
  const profile = profileSnap.exists ? (profileSnap.data() as Record<string, unknown>) : {};
  const role = String(profile?.role || "");
  if (role !== "EMPLOYER" && role !== "RECRUITER" && role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const companyId = effectiveTalentCompanyId(profile, decoded.uid);
  return { decoded, profile, companyId, role };
}

export function talentPoolMemberDocId(poolId: string, candidateId: string): string {
  return `${poolId}_${candidateId}`.replace(/\//g, "_");
}

export async function assertPoolInCompany(
  poolId: string,
  companyId: string
): Promise<{ error: NextResponse } | { id: string; data: Record<string, unknown> }> {
  const ref = adminDb.collection("talentPools").doc(poolId);
  const snap = await ref.get();
  if (!snap.exists) {
    return { error: NextResponse.json({ error: "Pool not found" }, { status: 404 }) };
  }
  const data = snap.data() as Record<string, unknown>;
  if (String(data.companyId || "") !== companyId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { id: snap.id, data };
}
