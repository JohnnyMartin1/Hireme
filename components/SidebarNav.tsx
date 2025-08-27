import Link from 'next/link';

interface NavItem {
  label: string;
  href: string;
}

interface SidebarNavProps {
  role: string;
}

/**
 * Sidebar navigation component. Renders a vertical list of links
 * appropriate for the user's role. For example, employers see a link
 * for posting jobs and saving candidates, whereas job seekers see
 * saved jobs.
 */
export default function SidebarNav({ role }: SidebarNavProps) {
  const common: NavItem[] = [
    { label: 'Home', href: role === 'EMPLOYER' ? '/home/employer' : '/home/seeker' },
    { label: 'Search', href: role === 'EMPLOYER' ? '/search/candidates' : '/search/jobs' },
    { label: 'Messages', href: '/messages' },
    { label: 'Account', href: '/account/profile' },
  ];
  const extra: NavItem[] = [];
  if (role === 'EMPLOYER') {
    extra.push({ label: 'Post Job', href: '/employer/job/new' });
    extra.push({ label: 'Saved Candidates', href: '/saved/candidates' });
  } else if (role === 'JOB_SEEKER') {
    extra.push({ label: 'Saved Jobs', href: '/saved/jobs' });
  }
  if (role === 'ADMIN') {
    extra.push({ label: 'Admin', href: '/admin' });
  }
  const items = [...common, ...extra];
  return (
    <aside className="hidden md:block w-64 bg-gray-100 h-full p-4 border-r">
      <nav className="space-y-2">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="block px-3 py-2 rounded hover:bg-gray-200">
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}