import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Helper to coerce arrays safely
  const arr = (v: any) => Array.isArray(v) ? v : (typeof v === "string" && v.trim() ? v.split(",").map((s:string)=>s.trim()) : []);

  try {
    const data = {
      // basics
      firstName: body.firstName ?? "",
      lastName: body.lastName ?? "",
      headline: body.headline ?? "",
      bio: body.bio ?? "",
      avatarUrl: body.avatarUrl ?? null,

      // tags/skills
      skills: arr(body.skills),

      // links/contact
      website: body.website ?? "",
      linkedin: body.linkedin ?? "",
      github: body.github ?? "",
      portfolio: body.portfolio ?? "",
      phone: body.phone ?? "",

      // location
      locationCity: body.locationCity ?? "",
      locationState: body.locationState ?? "",
      locationCountry: body.locationCountry ?? "",

      // preferences
      desiredTitles: arr(body.desiredTitles),
      desiredLocations: arr(body.desiredLocations),
      workModes: arr(body.workModes),
      workAuth: body.workAuth ?? "",
      openToRelocate: Boolean(body.openToRelocate),
      openToRemote: body.openToRemote === undefined ? true : Boolean(body.openToRemote),
      startDate: body.startDate ? new Date(body.startDate) : null,
      minSalary: body.minSalary !== undefined ? Number(body.minSalary) : null,
      salaryCurrency: body.salaryCurrency ?? "USD",
      yearsExperience: body.yearsExperience !== undefined ? Number(body.yearsExperience) : null,

      // education snapshot
      school: body.school ?? "",
      degreeType: body.degreeType ?? "",
      major: body.major ?? "",
      graduationYear: body.graduationYear !== undefined ? Number(body.graduationYear) : null,
      gpa: body.gpa !== undefined && body.gpa !== "" ? Number(body.gpa) : null,

      // achievements/languages
      certifications: arr(body.certifications),
      languages: arr(body.languages),

      // uploads (unchanged here)
      resumeUrl: body.resumeUrl ?? null,
      videoUrl: body.videoUrl ?? null,

      seeking: body.seeking ?? "",
      visibility: body.visibility === undefined ? true : Boolean(body.visibility),
    };

    const saved = await prisma.profile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    return NextResponse.json({ ok: true, profile: saved });
  } catch (e:any) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
