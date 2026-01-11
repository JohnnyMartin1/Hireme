"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, UserRound, ShieldCheck } from "lucide-react";

const items = [
  { href: "/account/profile", label: "Edit profile", icon: UserRound },
  { href: "/account/uploads", label: "Resume & video", icon: ShieldCheck },
  { href: "/messages", label: "Inbox", icon: Inbox },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="bg-white rounded-2xl shadow-sm border-2 border-slate-100 p-4 md:p-6 sticky top-24 h-max">
      <h2 className="font-bold text-navy-900 mb-4">Account Settings</h2>
      <nav className="space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
                ${active 
                  ? "bg-navy-800 text-white shadow-md" 
                  : "text-slate-600 hover:bg-sky-50 hover:text-navy-800"
                }
              `}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
