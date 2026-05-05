import { NextRequest, NextResponse } from "next/server";
import { rateLimitResponseIfExceeded } from "@/lib/api-rate-limit";
import { writeAuditLog } from "@/lib/server/audit-log";
import {
  UPLOAD_CONFIG,
  clearUserFileMetadata,
  createWriteSignedUrl,
  deleteFromStorage,
  getAuthedUser,
  saveUserFileMetadata,
  verifyStorageObjectUploaded,
} from "@/lib/server/candidate-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authed = await getAuthedUser(request);
    if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as {
      mode?: "prepare" | "complete";
      fileName?: string;
      mimeType?: string;
      sizeBytes?: number;
      storagePath?: string;
    };
    const mode = body.mode || "prepare";
    const rlKey = mode === "complete" ? "upload-video-complete" : "upload-video-prepare";
    const rl = await rateLimitResponseIfExceeded(rlKey, request, {
      windowMs: 60 * 60 * 1000,
      max: mode === "complete" ? 40 : 20,
      uid: authed.decoded.uid,
    });
    if (rl) return rl;

    const cfg = UPLOAD_CONFIG.video;
    const mimeType = String(body.mimeType || "");
    const sizeBytes = Number(body.sizeBytes || 0);
    if (!cfg.mime.test(mimeType)) return NextResponse.json({ error: "Video must be MP4/WEBM/QuickTime" }, { status: 400 });
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > cfg.maxBytes) {
      return NextResponse.json({ error: "Video exceeds 100MB limit" }, { status: 400 });
    }

    if (mode === "prepare") {
      const fileName = String(body.fileName || "intro-video");
      const { uploadUrl, storagePath } = await createWriteSignedUrl({ uid: authed.decoded.uid, kind: "video", fileName, mimeType });
      return NextResponse.json({ ok: true, uploadUrl, storagePath, requiredHeaders: { "Content-Type": mimeType } });
    }

    const storagePath = String(body.storagePath || "");
    if (!storagePath || !storagePath.startsWith(`videos/${authed.decoded.uid}/`)) {
      return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
    }

    const verified = await verifyStorageObjectUploaded({
      storagePath,
      allowedContentTypePrefixes: ["video/"],
      minBytes: 1,
    });
    if (!verified.ok) {
      await writeAuditLog({
        eventType: "upload.video.verify_failed",
        outcome: "denied",
        actorUserId: authed.decoded.uid,
        actorRole: String(authed.user.role || ""),
        metadata: { reason: verified.reason },
        request,
      });
      return NextResponse.json({ error: "Upload not found or invalid. Complete the file upload, then try again." }, { status: 400 });
    }

    await saveUserFileMetadata({
      uid: authed.decoded.uid,
      kind: "video",
      storagePath,
      fileName: String(body.fileName || "intro-video"),
      mimeType: verified.contentType || mimeType,
      sizeBytes: verified.sizeBytes,
    });
    await writeAuditLog({
      eventType: "upload.video.complete",
      outcome: "success",
      actorUserId: authed.decoded.uid,
      actorRole: String(authed.user.role || ""),
      resourceType: "storage",
      resourceId: storagePath,
      metadata: { sizeBytes: verified.sizeBytes },
      request,
    });
    return NextResponse.json({
      ok: true,
      file: { storagePath, name: body.fileName, mimeType: verified.contentType || mimeType, sizeBytes: verified.sizeBytes },
    });
  } catch (error) {
    console.error("POST /api/upload/video", error);
    return NextResponse.json({ error: "Video upload failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authed = await getAuthedUser(request);
    if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rl = await rateLimitResponseIfExceeded("upload-video-delete", request, {
      windowMs: 60 * 60 * 1000,
      max: 30,
      uid: authed.decoded.uid,
    });
    if (rl) return rl;
    const currentPath = String(authed.user.introVideoStoragePath || "");
    if (currentPath) await deleteFromStorage(currentPath);
    await clearUserFileMetadata(authed.decoded.uid, "video");
    await writeAuditLog({
      eventType: "upload.video.delete",
      outcome: "success",
      actorUserId: authed.decoded.uid,
      actorRole: String(authed.user.role || ""),
      resourceType: "storage",
      resourceId: currentPath || null,
      request,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/upload/video", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
