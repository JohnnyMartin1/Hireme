import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { assertEmployerCandidateAccess, createReadSignedUrl } from "@/lib/server/candidate-files";

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
    if ("error" in access) return access.error;

    const candidateSnap = await adminDb.collection("users").doc(candidateId).get();
    if (!candidateSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data = (candidateSnap.data() || {}) as Record<string, unknown>;
    const f = TYPE_FIELDS[type];
    const storagePath = String(data[f.path] || "");
    if (!storagePath) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const signedUrl = await createReadSignedUrl(storagePath, 10);
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

