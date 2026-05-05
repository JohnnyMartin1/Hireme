import { NextRequest, NextResponse } from "next/server";
import { rateLimitResponseIfExceeded } from "@/lib/api-rate-limit";
import { writeAuditLog } from "@/lib/server/audit-log";
import { UPLOAD_CONFIG, clearUserFileMetadata, deleteFromStorage, getAuthedUser, saveBinaryToStorage, saveUserFileMetadata } from "@/lib/server/candidate-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authed = await getAuthedUser(request);
    if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rl = await rateLimitResponseIfExceeded("upload-profile-image", request, {
      windowMs: 60 * 60 * 1000,
      max: 30,
      uid: authed.decoded.uid,
    });
    if (rl) return rl;

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
    await writeAuditLog({
      eventType: "upload.profile_image",
      outcome: "success",
      actorUserId: authed.decoded.uid,
      actorRole: String(authed.user.role || ""),
      resourceType: "storage",
      resourceId: storagePath,
      metadata: { sizeBytes: file.size },
      request,
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
    const rl = await rateLimitResponseIfExceeded("upload-profile-image-delete", request, {
      windowMs: 60 * 60 * 1000,
      max: 30,
      uid: authed.decoded.uid,
    });
    if (rl) return rl;
    const currentPath = String(authed.user.profileImageStoragePath || "");
    if (currentPath) await deleteFromStorage(currentPath);
    await clearUserFileMetadata(authed.decoded.uid, "profile-image");
    await writeAuditLog({
      eventType: "upload.profile_image.delete",
      outcome: "success",
      actorUserId: authed.decoded.uid,
      actorRole: String(authed.user.role || ""),
      resourceType: "storage",
      resourceId: currentPath || null,
      request,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/upload/profile-image", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
