import { NextRequest, NextResponse } from "next/server";
import { UPLOAD_CONFIG, clearUserFileMetadata, deleteFromStorage, getAuthedUser, saveBinaryToStorage, saveUserFileMetadata } from "@/lib/server/candidate-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authed = await getAuthedUser(request);
    if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });

    const cfg = UPLOAD_CONFIG.transcript;
    if (!cfg.mime.test(file.type)) return NextResponse.json({ error: "Transcript must be PDF/JPEG/PNG/WEBP" }, { status: 400 });
    if (file.size > cfg.maxBytes) return NextResponse.json({ error: "Transcript exceeds 10MB limit" }, { status: 400 });

    const storagePath = `transcripts/${authed.decoded.uid}/${Date.now()}_${String(file.name || "transcript").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const data = Buffer.from(await file.arrayBuffer());
    await saveBinaryToStorage(storagePath, data, file.type);
    await saveUserFileMetadata({
      uid: authed.decoded.uid,
      kind: "transcript",
      storagePath,
      fileName: file.name || "transcript",
      mimeType: file.type,
      sizeBytes: file.size,
    });
    return NextResponse.json({ ok: true, file: { storagePath, name: file.name, mimeType: file.type, sizeBytes: file.size } });
  } catch (error) {
    console.error("POST /api/upload/transcript", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authed = await getAuthedUser(request);
    if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const currentPath = String(authed.user.transcriptStoragePath || "");
    if (currentPath) await deleteFromStorage(currentPath);
    await clearUserFileMetadata(authed.decoded.uid, "transcript");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/upload/transcript", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

