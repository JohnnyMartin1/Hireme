import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import admin from "firebase-admin";
import { TEMPLATE_TYPES, type MessageTemplateType } from "@/lib/communication-workflow";
import type { PipelineStage } from "@/lib/firebase-firestore";

export const dynamic = "force-dynamic";

const ALLOWED_STAGES: PipelineStage[] = [
  "NEW",
  "SHORTLIST",
  "CONTACTED",
  "RESPONDED",
  "INTERVIEW",
  "FINALIST",
  "REJECTED",
];

async function authorize(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const decoded = await adminAuth.verifyIdToken(token);
  const profileSnap = await adminDb.collection("users").doc(decoded.uid).get();
  const profile = profileSnap.exists ? (profileSnap.data() as Record<string, unknown>) : {};
  const role = String(profile?.role || "");
  if (role !== "EMPLOYER" && role !== "RECRUITER" && role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { decoded, profile };
}

function normalizeType(value: unknown): MessageTemplateType {
  const raw = String(value || "").toUpperCase().trim();
  if ((TEMPLATE_TYPES as readonly string[]).includes(raw)) return raw as MessageTemplateType;
  return "CUSTOM";
}

function normalizeStage(value: unknown): PipelineStage | null {
  if (value == null || value === "") return null;
  const raw = String(value).toUpperCase().trim();
  if ((ALLOWED_STAGES as readonly string[]).includes(raw)) return raw as PipelineStage;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authorize(request);
    if (auth.error) return auth.error;
    const uid = auth.decoded!.uid;
    const companyId = auth.profile?.companyId ? String(auth.profile.companyId) : "";
    const byOwner = await adminDb.collection("messageTemplates").where("ownerUserId", "==", uid).get();
    const ownerRows = byOwner.docs.map((d) => ({ id: d.id, ...d.data() }));
    let companyRows: any[] = [];
    if (companyId) {
      const byCompany = await adminDb.collection("messageTemplates").where("companyId", "==", companyId).get();
      companyRows = byCompany.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    const dedupedById = new Map<string, any>();
    for (const row of [...ownerRows, ...companyRows]) dedupedById.set(String(row.id), row);
    const templates = Array.from(dedupedById.values()).sort((a, b) => {
      const aDate = a?.updatedAt?.toDate ? a.updatedAt.toDate() : a?.updatedAt || a?.createdAt || null;
      const bDate = b?.updatedAt?.toDate ? b.updatedAt.toDate() : b?.updatedAt || b?.createdAt || null;
      return new Date(bDate || 0).getTime() - new Date(aDate || 0).getTime();
    });
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("GET /api/message-templates", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorize(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const bodyText = String(body?.body || "").trim();
    const subject = String(body?.subject || "").trim();
    const type = normalizeType(body?.type);
    const stage = normalizeStage(body?.stage);
    const scope = String(body?.scope || "USER").toUpperCase().trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!bodyText) return NextResponse.json({ error: "Body is required" }, { status: 400 });

    const payload = {
      ownerUserId: auth.decoded!.uid,
      companyId:
        scope === "COMPANY" && auth.profile?.companyId ? String(auth.profile.companyId) : null,
      name,
      type,
      stage,
      subject,
      body: bodyText,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await adminDb.collection("messageTemplates").add(payload);
    const fresh = await ref.get();
    return NextResponse.json({ template: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("POST /api/message-templates", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authorize(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || "");
    if (!id) return NextResponse.json({ error: "Missing template id" }, { status: 400 });
    const ref = adminDb.collection("messageTemplates").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    const existing = snap.data() as Record<string, unknown>;
    const existingOwner = String(existing?.ownerUserId || "");
    const existingCompany = String(existing?.companyId || "");
    const myCompany = String(auth.profile?.companyId || "");
    if (existingOwner !== auth.decoded!.uid && !(existingCompany && existingCompany === myCompany)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (body?.name !== undefined) updates.name = String(body.name || "").trim();
    if (body?.body !== undefined) updates.body = String(body.body || "").trim();
    if (body?.subject !== undefined) updates.subject = String(body.subject || "").trim();
    if (body?.type !== undefined) updates.type = normalizeType(body.type);
    if (body?.stage !== undefined) updates.stage = normalizeStage(body.stage);
    await ref.set(updates, { merge: true });
    const fresh = await ref.get();
    return NextResponse.json({ template: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("PATCH /api/message-templates", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authorize(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || "");
    if (!id) return NextResponse.json({ error: "Missing template id" }, { status: 400 });
    const ref = adminDb.collection("messageTemplates").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    const existing = snap.data() as Record<string, unknown>;
    const existingOwner = String(existing?.ownerUserId || "");
    const existingCompany = String(existing?.companyId || "");
    const myCompany = String(auth.profile?.companyId || "");
    if (existingOwner !== auth.decoded!.uid && !(existingCompany && existingCompany === myCompany)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await ref.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/message-templates", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
