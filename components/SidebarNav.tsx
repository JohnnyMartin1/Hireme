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
  const items: NavItem[] = [
    { label: 'Home', href: role === 'EMPLOYER' ? '/home/employer' : '/home/seeker' },
    { label: 'Messages', href: '/messages' },
    { label: 'Account', href: '/account/profile' },
  ];

  if (role === 'EMPLOYER') {
    items.splice(1, 0, { label: 'Search Candidates', href: '/search/candidates' });
    items.push({ label: 'Post Job', href: '/employer/job/new' });
    items.push({ label: 'Saved Candidates', href: '/saved/candidates' });
  } else if (role === 'JOB_SEEKER') {
    items.push({ label: 'Profile', href: '/account/profile' });
    items.push({ label: 'Uploads', href: '/account/uploads' });
    items.push({ label: 'Security', href: '/account/security' });
  }
  
  if (role === 'ADMIN') {
    items.push({ label: 'Admin', href: '/admin' });
  }
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