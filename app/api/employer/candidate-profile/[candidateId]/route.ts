import { NextRequest, NextResponse } from "next/server";
import { rateLimitResponseIfExceeded } from "@/lib/api-rate-limit";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { stripCandidateUserForEmployerResponse } from "@/lib/server/strip-candidate-for-employer";
import { isServerAdminUser } from "@/lib/admin-access";
import { canUserAccessJob } from "@/lib/matching/job-access";
import { assertCandidateTiedToJob } from "@/lib/interviews/phase3";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { candidateId: string } }
) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const candidateId = params.candidateId;
    if (!candidateId) {
      return NextResponse.json({ error: "Missing candidate id" }, { status: 400 });
    }

    const rl = await rateLimitResponseIfExceeded(`employer-candidate-profile:${candidateId}`, request, {
      windowMs: 60 * 1000,
      max: 120,
      uid: decoded.uid,
    });
    if (rl) return rl;

    const viewerSnap = await adminDb.collection("users").doc(decoded.uid).get();
    const viewer = viewerSnap.data() as Record<string, unknown> | undefined;
    const viewerRole = String(viewer?.role || "");
    const employerLikeAllowed =
      viewerRole === "EMPLOYER" ||
      viewerRole === "RECRUITER" ||
      viewerRole === "ADMIN" ||
      isServerAdminUser(viewerRole, decoded.email);

    if (!employerLikeAllowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const isAdmin = viewerRole === "ADMIN" || isServerAdminUser(viewerRole, decoded.email);

    const candSnap = await adminDb.collection("users").doc(candidateId).get();
    if (!candSnap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const raw = candSnap.data() as Record<string, unknown>;
    if (String(raw.role || "") !== "JOB_SEEKER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const publicSnap = await adminDb.collection("publicCandidateProfiles").doc(candidateId).get();
    const publicProfile = publicSnap.exists
      ? { id: publicSnap.id, ...(publicSnap.data() as Record<string, unknown>) }
      : { id: candSnap.id, role: "JOB_SEEKER", firstName: raw.firstName || "", lastName: raw.lastName || "" };
    if (isAdmin) {
      const profile = stripCandidateUserForEmployerResponse({
        ...raw,
        id: candSnap.id,
        hasResume: Boolean(raw.resumeStoragePath || raw.resumeUrl),
        hasTranscript: Boolean(raw.transcriptStoragePath || raw.transcriptUrl),
        hasIntroVideo: Boolean(raw.introVideoStoragePath || raw.videoUrl),
      });
      return NextResponse.json({ profile, visibility: "private" });
    }

    const jobId = String(request.nextUrl.searchParams.get("jobId") || "").trim();
    const threadId = String(request.nextUrl.searchParams.get("threadId") || "").trim();
    const poolId = String(request.nextUrl.searchParams.get("poolId") || "").trim();

    let allowPrivate = false;
    if (jobId) {
      const jobSnap = await adminDb.collection("jobs").doc(jobId).get();
      if (jobSnap.exists) {
        const jobData = jobSnap.data() as Record<string, unknown>;
        const canAccess = await canUserAccessJob(adminDb, jobData, decoded.uid);
        if (canAccess && (await assertCandidateTiedToJob(jobId, candidateId))) {
          allowPrivate = true;
        }
      }
    }
    if (!allowPrivate && threadId) {
      const threadSnap = await adminDb.collection("messageThreads").doc(threadId).get();
      if (threadSnap.exists) {
        const td = threadSnap.data() as Record<string, unknown>;
        const participants = Array.isArray(td?.participantIds) ? (td.participantIds as string[]) : [];
        if (participants.includes(decoded.uid) && participants.includes(candidateId)) {
          allowPrivate = true;
        }
      }
    }
    if (!allowPrivate && poolId) {
      const poolSnap = await adminDb.collection("talentPools").doc(poolId).get();
      if (poolSnap.exists) {
        const pool = poolSnap.data() as Record<string, unknown>;
        const companyId = String(pool.companyId || "");
        if (companyId && String(viewer?.companyId || "") === companyId) {
          const memberSnap = await adminDb.collection("talentPoolMembers").doc(`${poolId}_${candidateId}`.replace(/\//g, "_")).get();
          if (memberSnap.exists) allowPrivate = true;
        }
      }
    }

    if (!allowPrivate) {
      return NextResponse.json({ profile: publicProfile, visibility: "public" });
    }

    const profile = stripCandidateUserForEmployerResponse({
      ...raw,
      id: candSnap.id,
      hasResume: Boolean(raw.resumeStoragePath || raw.resumeUrl),
      hasTranscript: Boolean(raw.transcriptStoragePath || raw.transcriptUrl),
      hasIntroVideo: Boolean(raw.introVideoStoragePath || raw.videoUrl),
    });
    return NextResponse.json({ profile, visibility: "private" });
  } catch (e) {
    console.error("GET /api/employer/candidate-profile/[candidateId]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
