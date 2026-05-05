import { NextRequest, NextResponse } from "next/server";

/** Accept CSP violation reports (report-uri / report-to). Body is discarded to avoid storing PII. */
export async function POST(request: NextRequest) {
  const len = Number(request.headers.get("content-length") || "0");
  if (len > 65536) {
    return new NextResponse(null, { status: 413 });
  }
  await request.text().catch(() => "");
  return new NextResponse(null, { status: 204 });
}
