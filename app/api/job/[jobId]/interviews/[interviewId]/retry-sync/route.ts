import { NextRequest } from "next/server";
import { PATCH as patchCollectionRoute } from "@/app/api/job/[jobId]/interviews/route";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string; interviewId: string } }
) {
  const cloned = new Request(request.url, {
    method: "PATCH",
    headers: request.headers,
    body: JSON.stringify({ interviewId: params.interviewId, retrySync: true }),
  });
  return patchCollectionRoute(cloned as NextRequest, { params: { jobId: params.jobId } });
}
