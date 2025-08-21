"use client";
import Link from "next/link";

export default function SidebarNav({ role }: { role: "JOB_SEEKER" | "EMPLOYER" | "ADMIN" }) {
  const common = [
    { href: "/home", label: "Home" },
    { href: "/messages", label: "Messages" },
    { href: role === "EMPLOYER" ? "/account/company" : "/account/profile", label: "Account" },
  ];

  const employerOnly = [
    { href: "/search/candidates", label: "Search candidates" },
    { href: "/employer/job/new", label: "Post a job" },
    { href: "/saved/candidates", label: "Saved candidates" },
  ];

  const items = role === "EMPLOYER" ? [...common, ...employerOnly] : common;

  return (
    <nav className="p-4 space-y-2">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="block px-3 py-2 rounded hover:bg-gray-100">
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
