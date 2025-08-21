"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Breadcrumbs component that splits the current pathname into segments
 * and renders a breadcrumb trail. Each segment (except the last) is
 * rendered as a link to its accumulated path. The last segment is
 * rendered as plain text.
 */
export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = segments.map((segment, idx) => {
    const href = '/' + segments.slice(0, idx + 1).join('/');
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    return { href, label };
  });
  if (crumbs.length === 0) return null;
  return (
    <nav className="text-sm text-gray-500 mb-4">
      {crumbs.map((crumb, idx) => (
        <span key={crumb.href}>
          {idx < crumbs.length - 1 ? (
            <>
              <Link href={crumb.href} className="hover:underline">
                {crumb.label}
              </Link>
              <span className="mx-1">/</span>
            </>
          ) : (
            <span>{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}