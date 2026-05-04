import { NextRequest, NextResponse } from "next/server";
import { UPLOAD_CONFIG, clearUserFileMetadata, createWriteSignedUrl, deleteFromStorage, getAuthedUser, saveUserFileMetadata } from "@/lib/server/candidate-files";

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
    const cfg = UPLOAD_CONFIG.video;
    const mimeType = String(body.mimeType || "");
    const sizeBytes = Number(body.sizeBytes || 0);
    if (!cfg.mime.test(mimeType)) return NextResponse.json({ error: "Video must be MP4/WEBM/QuickTime" }, { status: 400 });
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > cfg.maxBytes) return NextResponse.json({ error: "Video exceeds 100MB limit" }, { status: 400 });

    if (mode === "prepare") {
      const fileName = String(body.fileName || "intro-video");
      const { uploadUrl, storagePath } = await createWriteSignedUrl({ uid: authed.decoded.uid, kind: "video", fileName, mimeType });
      return NextResponse.json({ ok: true, uploadUrl, storagePath, requiredHeaders: { "Content-Type": mimeType } });
    }

    const storagePath = String(body.storagePath || "");
    if (!storagePath || !storagePath.startsWith(`videos/${authed.decoded.uid}/`)) {
      return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
    }
    await saveUserFileMetadata({
      uid: authed.decoded.uid,
      kind: "video",
      storagePath,
      fileName: String(body.fileName || "intro-video"),
      mimeType,
      sizeBytes,
    });
    return NextResponse.json({ ok: true, file: { storagePath, name: body.fileName, mimeType, sizeBytes } });
  } catch (error) {
    console.error("POST /api/upload/video", error);
    return NextResponse.json({ error: "Video upload failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authed = await getAuthedUser(request);
    if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const currentPath = String(authed.user.introVideoStoragePath || "");
    if (currentPath) await deleteFromStorage(currentPath);
    await clearUserFileMetadata(authed.decoded.uid, "video");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/upload/video", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

