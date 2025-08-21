import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // allow static and API
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.startsWith("/public")) {
    return NextResponse.next();
  }

  const token = await getToken({ req });
  const isAuthed = !!token;
  const role = (token as any)?.role || "JOB_SEEKER";

  // /home -> role home
  if (pathname === "/home" || pathname === "/home/") {
    const url = req.nextUrl.clone();
    url.pathname = isAuthed && role === "EMPLOYER" ? "/home/employer" : isAuthed ? "/home/seeker" : "/auth/login";
    return NextResponse.redirect(url);
  }

  // protect /home/*
  if (pathname.startsWith("/home") && !isAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // block job-search pages for candidates
  const employerOnlyRoutes = ["/search/jobs", "/saved/jobs"];
  if (employerOnlyRoutes.some((p) => pathname.startsWith(p)) && role !== "EMPLOYER") {
    const url = req.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = { matcher: ["/home", "/home/:path*", "/search/:path*", "/saved/:path*"] };
