// app/home/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/** Avoid static prerender races with auth/redirect hub. */
export const dynamic = "force-dynamic";

export default async function HomeHub() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = (session.user as any)?.role ?? "JOB_SEEKER";
  redirect(role === "EMPLOYER" ? "/home/employer" : "/home/seeker");
}
