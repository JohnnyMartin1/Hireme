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

    const cfg = UPLOAD_CONFIG["profile-image"];
    if (!cfg.mime.test(file.type)) return NextResponse.json({ error: "Profile image must be JPEG/PNG/WEBP" }, { status: 400 });
    if (file.size > cfg.maxBytes) return NextResponse.json({ error: "Profile image exceeds 5MB limit" }, { status: 400 });

    const storagePath = `profile-images/${authed.decoded.uid}/${Date.now()}_${String(file.name || "profile-image").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const data = Buffer.from(await file.arrayBuffer());
    await saveBinaryToStorage(storagePath, data, file.type);
    const { publicUrl } = await saveUserFileMetadata({
      uid: authed.decoded.uid,
      kind: "profile-image",
      storagePath,
      fileName: file.name || "profile-image",
      mimeType: file.type,
      sizeBytes: file.size,
    });
    return NextResponse.json({ ok: true, file: { storagePath, url: publicUrl, name: file.name, mimeType: file.type, sizeBytes: file.size } });
  } catch (error) {
    console.error("POST /api/upload/profile-image", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authed = await getAuthedUser(request);
    if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const currentPath = String(authed.user.profileImageStoragePath || "");
    if (currentPath) await deleteFromStorage(currentPath);
    await clearUserFileMetadata(authed.decoded.uid, "profile-image");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/upload/profile-image", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

