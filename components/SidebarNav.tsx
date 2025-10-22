import Link from 'next/link';
import {
  Home,
  MessageSquare,
  User,
  Search,
  Plus,
  Heart,
  Upload,
  Shield,
  Settings
} from 'lucide-react';
import HireMeLogo from './brand/HireMeLogo';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarNavProps {
  role: string;
}

export default function SidebarNav({ role }: SidebarNavProps) {
  const items: NavItem[] = [
    { label: 'Home', href: role === 'EMPLOYER' ? '/home/employer' : '/home/seeker', icon: Home },
    { label: 'Messages', href: '/messages', icon: MessageSquare },
  ];

  if (role === 'EMPLOYER') {
    items.push({ label: 'Search Candidates', href: '/search/candidates', icon: Search });
    items.push({ label: 'Post Job', href: '/employer/job/new', icon: Plus });
    items.push({ label: 'Saved Candidates', href: '/saved/candidates', icon: Heart });
  } else if (role === 'JOB_SEEKER') {
    items.push({ label: 'Edit Profile', href: '/account/profile', icon: User });
    items.push({ label: 'Uploads', href: '/account/uploads', icon: Upload });
    items.push({ label: 'Security', href: '/account/security', icon: Shield });
  }

  if (role === 'ADMIN') {
    items.push({ label: 'Admin', href: '/admin', icon: Settings });
  }

  return (
    <aside className="hidden md:block w-64 hireme-gradient-light h-full p-6 border-r border-[var(--border)] shadow-sm">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <HireMeLogo variant="full" className="h-6 w-auto" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--hireme-navy)] mb-2">Navigation</h2>
        <div className="w-12 h-1 bg-[var(--hireme-blue)] rounded"></div>
      </div>

      <nav className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center px-4 py-3 rounded-xl hover:bg-[var(--hireme-light-blue)] hover:text-[var(--hireme-navy)] transition-all duration-200 group"
          >
            <item.icon className="h-5 w-5 mr-3 text-[var(--muted)] group-hover:text-[var(--hireme-blue)] transition-colors" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-8 pt-6 border-t border-[var(--border)]">
        <div className="text-xs text-[var(--muted)] text-center">
          Role: <span className="font-medium capitalize text-[var(--hireme-navy)]">{role.toLowerCase()}</span>
        </div>
      </div>
    </aside>
  );
}