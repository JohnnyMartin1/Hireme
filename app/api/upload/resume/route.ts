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
    const rl = await rateLimitResponseIfExceeded("upload-resume", request, {
      windowMs: 60 * 60 * 1000,
      max: 25,
      uid: authed.decoded.uid,
    });
    if (rl) return rl;

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });

    const cfg = UPLOAD_CONFIG.resume;
    if (!cfg.mime.test(file.type)) return NextResponse.json({ error: "Resume must be a PDF" }, { status: 400 });
    if (file.size > cfg.maxBytes) return NextResponse.json({ error: "Resume exceeds 5MB limit" }, { status: 400 });

    const storagePath = `resumes/${authed.decoded.uid}/${Date.now()}_${String(file.name || "resume.pdf").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const data = Buffer.from(await file.arrayBuffer());
    await saveBinaryToStorage(storagePath, data, file.type);
    await saveUserFileMetadata({
      uid: authed.decoded.uid,
      kind: "resume",
      storagePath,
      fileName: file.name || "resume.pdf",
      mimeType: file.type,
      sizeBytes: file.size,
    });
    await writeAuditLog({
      eventType: "upload.resume",
      outcome: "success",
      actorUserId: authed.decoded.uid,
      actorRole: String(authed.user.role || ""),
      resourceType: "storage",
      resourceId: storagePath,
      metadata: { sizeBytes: file.size },
      request,
    });
    return NextResponse.json({ ok: true, file: { storagePath, name: file.name, mimeType: file.type, sizeBytes: file.size } });
  } catch (error) {
    console.error("POST /api/upload/resume", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authed = await getAuthedUser(request);
    if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rl = await rateLimitResponseIfExceeded("upload-resume-delete", request, {
      windowMs: 60 * 60 * 1000,
      max: 30,
      uid: authed.decoded.uid,
    });
    if (rl) return rl;
    const currentPath = String(authed.user.resumeStoragePath || "");
    if (currentPath) await deleteFromStorage(currentPath);
    await clearUserFileMetadata(authed.decoded.uid, "resume");
    await writeAuditLog({
      eventType: "upload.resume.delete",
      outcome: "success",
      actorUserId: authed.decoded.uid,
      actorRole: String(authed.user.role || ""),
      resourceType: "storage",
      resourceId: currentPath || null,
      request,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/upload/resume", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

