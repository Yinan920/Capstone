import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Bell,
  LayoutDashboard,
  MessageSquareReply,
  Swords,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import TierToggle from '@/components/ui/TierToggle';
import DatasetSwitcher from './DatasetSwitcher';
import Logo from './Logo';
import { useAppStore } from '@/store/appStore';
import { MOCK_USER } from '@/mocks/data';

const NAV = [
  { to: '/app', label: 'Insights', icon: LayoutDashboard, end: true },
  { to: '/app/competitors', label: 'Competitors', icon: Swords, premium: true },
  { to: '/app/alerts', label: 'Alerts', icon: Bell, premium: true },
  { to: '/app/reply', label: 'Reply Studio', icon: MessageSquareReply, premium: true },
];

export default function AppShell() {
  const tier = useAppStore((s) => s.tier);

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-ink/[0.07] bg-white lg:flex">
        <div className="px-6 py-6">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-4">
          {NAV.map(({ to, label, icon: Icon, end, premium }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-ink/60 hover:bg-ink/[0.04] hover:text-ink',
                )
              }
            >
              <span className="flex items-center gap-3">
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </span>
              {premium && tier === 'free' && (
                <span className="rounded-full bg-brand-grad px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                  Pro
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-ink/[0.07] p-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-grad text-sm font-bold text-white">
              {MOCK_USER.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{MOCK_USER.name}</p>
              <p className="truncate text-xs text-ink/45">{MOCK_USER.email}</p>
            </div>
          </div>
          <Link
            to="/"
            className="mt-2 flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-ink/45 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to site
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-ink/[0.07] bg-surface/80 px-5 py-3 backdrop-blur sm:px-8">
          <div className="lg:hidden">
            <Link to="/">
              <Logo compact />
            </Link>
          </div>
          <DatasetSwitcher />
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-medium text-ink/45 sm:inline">Demo plan</span>
            <TierToggle />
          </div>
        </header>

        <main className="container-page py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
