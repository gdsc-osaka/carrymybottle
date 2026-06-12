'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  Droplets,
  LayoutDashboard,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** 完全一致で判定する（前方一致だと他項目に巻き込まれるトップ用）。 */
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/admin',
    label: 'ダッシュボード',
    icon: LayoutDashboard,
    exact: true,
  },
  { href: '/admin/stations', label: '給水機', icon: Droplets },
  { href: '/admin/requests', label: '設置希望', icon: MapPin },
  { href: '/admin/contacts', label: '緊急連絡', icon: AlertTriangle },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-teal-50 hover:text-teal-700'
            )}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
