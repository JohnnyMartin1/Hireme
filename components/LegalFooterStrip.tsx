"use client";
import Link from "next/link";

/** Compact legal links for authenticated app chrome (not legal advice). */
export default function LegalFooterStrip() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50/80 text-center py-3 text-xs text-slate-600">
      <Link href="/terms/privacy" className="text-sky-700 hover:underline mx-2">
        Privacy Policy
      </Link>
      <span aria-hidden="true">·</span>
      <Link href="/terms/candidates" className="text-sky-700 hover:underline mx-2">
        Candidate terms
      </Link>
      <span aria-hidden="true">·</span>
      <Link href="/terms/cookie" className="text-sky-700 hover:underline mx-2">
        Cookie policy
      </Link>
      <span aria-hidden="true">·</span>
      <a href="mailto:support@officialhireme.com" className="text-sky-700 hover:underline mx-2">
        Support
      </a>
    </footer>
  );
}
