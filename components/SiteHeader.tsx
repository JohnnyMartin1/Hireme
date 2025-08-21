import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import SignOutButton from "./SignOutButton";

type UserRole = "JOB_SEEKER" | "EMPLOYER" | "ADMIN" | undefined;

export default async function SiteHeader() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: UserRole } | undefined;
  const role: UserRole = user?.role ?? "JOB_SEEKER";
  const isAuthed = Boolean(user?.id);

  const dashboardHref = role === "EMPLOYER" ? "/home/employer" : "/home/seeker";

  return (
    <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/hireme-logo.png"   // put your correct logo at public/hireme-logo.png (or change to .svg)
            alt="HireMe"
            width={28}
            height={28}
            className="h-7 w-7"
            priority
          />
          <span className="font-semibold tracking-tight text-lg">HireMe</span>
        </Link>

        {!isAuthed ? (
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">Home</Link>
            <div className="flex items-center gap-2">
              <Link
                href="/auth/signup"
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Sign up
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Log in
              </Link>
            </div>
          </nav>
        ) : (
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">Home</Link>
            <Link href={dashboardHref} className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
            <Link href="/account" className="text-sm text-gray-600 hover:text-gray-900">Account</Link>
            <SignOutButton />
          </nav>
        )}
      </div>
    </header>
  );
}
