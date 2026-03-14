'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  { href: '/generate', label: 'Generate', icon: '✦' },
  { href: '/gallery', label: 'Gallery', icon: '◫' },
  { href: '/projects', label: 'Projects', icon: '◰' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export function Nav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-t border-border">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {navItems.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                active ? 'text-accent' : 'text-fg-muted hover:text-fg-secondary'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
