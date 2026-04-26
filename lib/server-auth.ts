import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export type ServerAuthedUser = {
  uid: string;
  email?: string;
  role: string;
  companyId?: string;
  profile: Record<string, unknown>;
};

export async function getServerAuthedUser(request: NextRequest): Promise<ServerAuthedUser | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const decoded = await adminAuth.verifyIdToken(token);
  const profileSnap = await adminDb.collection("users").doc(decoded.uid).get();
  const profile = (profileSnap.exists ? profileSnap.data() : {}) as Record<string, unknown>;
  return {
    uid: decoded.uid,
    email: decoded.email,
    role: String(profile?.role || ""),
    companyId: profile?.companyId ? String(profile.companyId) : undefined,
    profile,
  };
}

export function canManageCalendarIntegration(role: string) {
  return role === "EMPLOYER" || role === "RECRUITER" || role === "ADMIN";
}
