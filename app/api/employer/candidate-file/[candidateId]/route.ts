import { NextRequest, NextResponse } from "next/server";
import { rateLimitResponseIfExceeded } from "@/lib/api-rate-limit";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { assertEmployerCandidateAccess, createReadSignedUrl } from "@/lib/server/candidate-files";
import { writeAuditLog } from "@/lib/server/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPE_FIELDS = {
  resume: { path: "resumeStoragePath", name: "resumeFileName", mime: "resumeMimeType", size: "resumeSizeBytes" },
  transcript: { path: "transcriptStoragePath", name: "transcriptFileName", mime: "transcriptMimeType", size: "transcriptSizeBytes" },
  video: { path: "introVideoStoragePath", name: "introVideoFileName", mime: "introVideoMimeType", size: "introVideoSizeBytes" },
} as const;

export async function GET(request: NextRequest, { params }: { params: { candidateId: string } }) {
  try {
    const candidateId = params.candidateId;
    const type = String(request.nextUrl.searchParams.get("type") || "").trim() as keyof typeof TYPE_FIELDS;
    if (!candidateId || !(type in TYPE_FIELDS)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const access = await assertEmployerCandidateAccess({
      request,
      candidateId,
      allowedJobId: request.nextUrl.searchParams.get("jobId"),
      threadId: request.nextUrl.searchParams.get("threadId"),
      poolId: request.nextUrl.searchParams.get("poolId"),
    });
    if ("error" in access) {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      let actorUid: string | null = null;
      let actorRole = "";
      if (token) {
        try {
          const d = await adminAuth.verifyIdToken(token);
          actorUid = d.uid;
          const snap = await adminDb.collection("users").doc(d.uid).get();
          actorRole = String((snap.data() as Record<string, unknown> | undefined)?.role || "");
        } catch {
          /* ignore */
        }
      }
      await writeAuditLog({
        eventType: "employer.candidate_file.denied",
        outcome: "denied",
        actorUserId: actorUid,
        actorRole,
        candidateId,
        metadata: { type },
        request,
      });
      return access.error;
    }

    const rl = await rateLimitResponseIfExceeded(
      `employer-candidate-file:${candidateId}:${type}`,
      request,
      {
        windowMs: 10 * 60 * 1000,
        max: 40,
        uid: access.authed.decoded.uid,
      }
    );
    if (rl) {
      await writeAuditLog({
        eventType: "employer.candidate_file.rate_limited",
        outcome: "denied",
        actorUserId: access.authed.decoded.uid,
        actorRole: String(access.authed.user.role || ""),
        candidateId,
        metadata: { type },
        request,
      });
      return rl;
    }

    const candidateSnap = await adminDb.collection("users").doc(candidateId).get();
    if (!candidateSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data = (candidateSnap.data() || {}) as Record<string, unknown>;
    const f = TYPE_FIELDS[type];
    const storagePath = String(data[f.path] || "");
    if (!storagePath) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const signedUrl = await createReadSignedUrl(storagePath, 10);
    await writeAuditLog({
      eventType: "employer.candidate_file.signed_url",
      outcome: "success",
      actorUserId: access.authed.decoded.uid,
      actorRole: String(access.authed.user.role || ""),
      candidateId,
      resourceType: type,
      metadata: { expiresInSeconds: 600 },
      request,
    });
    return NextResponse.json({
      ok: true,
      file: {
        type,
        url: signedUrl,
        expiresInSeconds: 600,
        fileName: String(data[f.name] || ""),
        mimeType: String(data[f.mime] || ""),
        sizeBytes: Number(data[f.size] || 0),
      },
    });
  } catch (error) {
    console.error("GET /api/employer/candidate-file/[candidateId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
