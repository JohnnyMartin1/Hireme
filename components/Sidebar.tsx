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
    <aside className="hireme-card p-4 md:p-6 sticky top-24 h-max">
      <h2 className="font-semibold text-[var(--text)] mb-4">Account Settings</h2>
      <nav className="space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors
                ${active 
                  ? "bg-[var(--hireme-blue)] text-white shadow-sm" 
                  : "hover:bg-[var(--hireme-light-blue)] text-[var(--muted)] hover:text-[var(--text)]"
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
