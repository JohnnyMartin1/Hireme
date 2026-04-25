import { NextRequest, NextResponse } from "next/server";
import { PATCH as patchCollectionRoute } from "@/app/api/job/[jobId]/interviews/route";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { jobId: string; interviewId: string } }
) {
  const body = await request.json().catch(() => ({}));
  const cloned = new Request(request.url, {
    method: "PATCH",
    headers: request.headers,
    body: JSON.stringify({ ...body, interviewId: params.interviewId }),
  });
  return patchCollectionRoute(cloned as NextRequest, { params: { jobId: params.jobId } });
}
