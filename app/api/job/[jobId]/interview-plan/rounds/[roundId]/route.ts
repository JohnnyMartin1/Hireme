import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { INTERVIEW_ROUND_TYPES, authorizeJobRequest, normalizeEnum, normalizeOptionalString, nowTs } from "@/lib/interviews/phase3";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { jobId: string; roundId: string } }) {
  try {
    const auth = await authorizeJobRequest(request, params.jobId);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const ref = adminDb.collection("interviewPlanRounds").doc(params.roundId);
    const snap = await ref.get();
    if (!snap.exists || String((snap.data() as any)?.jobId || "") !== params.jobId) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }
    const updates: Record<string, unknown> = { updatedAt: nowTs() };
    if (body?.roundName !== undefined) updates.roundName = String(body.roundName || "").trim();
    if (body?.roundType !== undefined) updates.roundType = normalizeEnum(body.roundType, INTERVIEW_ROUND_TYPES, "CUSTOM");
    if (body?.description !== undefined) updates.description = normalizeOptionalString(body.description);
    if (body?.defaultDurationMinutes !== undefined) updates.defaultDurationMinutes = Math.max(15, Number(body.defaultDurationMinutes || 30));
    if (body?.order !== undefined) updates.order = Number(body.order || 0);
    if (body?.required !== undefined) updates.required = Boolean(body.required);
    if (body?.defaultInterviewerIds !== undefined && Array.isArray(body.defaultInterviewerIds)) {
      updates.defaultInterviewerIds = body.defaultInterviewerIds.map((id: unknown) => String(id)).filter(Boolean);
    }
    if (body?.active !== undefined) updates.active = Boolean(body.active);
    await ref.set(updates, { merge: true });
    const fresh = await ref.get();
    return NextResponse.json({ round: { id: fresh.id, ...fresh.data() } });
  } catch (error) {
    console.error("PATCH /api/job/[jobId]/interview-plan/rounds/[roundId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { jobId: string; roundId: string } }) {
  try {
    const auth = await authorizeJobRequest(request, params.jobId);
    if (auth.error) return auth.error;
    const ref = adminDb.collection("interviewPlanRounds").doc(params.roundId);
    const snap = await ref.get();
    if (!snap.exists || String((snap.data() as any)?.jobId || "") !== params.jobId) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }
    await ref.set({ active: false, updatedAt: nowTs() }, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/job/[jobId]/interview-plan/rounds/[roundId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
