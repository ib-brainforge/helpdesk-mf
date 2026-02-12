import React, { useState, Suspense, useMemo } from 'react';

import './index.css';

import { NavLink, Outlet, useLocation } from '@modern-js/runtime/router';
import { Providers } from '@/providers';
import { useAuth, usePermissions, type GuardedItem } from '@brainforgeau/security';
import { TopNavbar } from '@brainforgeau/navbar/Navbar';
import { ErrorBoundary, SideNav, SideNavDesktopMode, PageSpinner } from '@brainforgeau/components';
import { TEST_IDS } from '@/constants/testIds';
import { PageTracker } from '@/observability';
import { HelpdeskPermissions } from '@/constants/permissions';

declare const __IDENTITY_BASE_URL__: string | undefined;

const MOBILE_BREAKPOINT = 1024;

interface NavItem {
  label: string;
  href?: string;
  icon: string;
  testId?: string;
  children?: NavItem[];
}

// Navigation items for the sidebar
const navItemsTop: GuardedItem<NavItem>[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'grids',
    testId: 'nav-dashboard',
  },
];

const navItemsBottom: GuardedItem<NavItem>[] = [
  {
    label: 'Configuration',
    href: '/configuration',
    icon: 'settings',
    testId: 'nav-configuration',
    children: [
      {
        label: 'Settings',
        href: '/configuration',
        icon: 'settings',
        testId: 'nav-configuration-settings',
        requiredPermissions: [HelpdeskPermissions.Settings.Read],
      },
    ],
  },
];

// Simple logo component for Helpdesk module
const Logo = () => (
  <span className="font-semibold text-primary">Helpdesk</span>
);

export default function Layout() {
  // Desktop sidebar: extended (full) or collapsed (icons only)
  const [desktopMode, setDesktopMode] = useState<SideNavDesktopMode>('extended');
  // Mobile drawer: closed by default
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleDesktopMode = () => {
    setDesktopMode(prev => prev === 'extended' ? 'collapsed' : 'extended');
  };

  // Handle hamburger menu click - toggle desktop mode on desktop, open drawer on mobile
  const handleNavExtend = () => {
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      setIsMobileOpen(true);
    } else {
      toggleDesktopMode();
    }
  };

  const { isAuthenticated } = useAuth();
  const { filterNavItems, permissions } = usePermissions();
  const location = useLocation();

  // Filter navigation items based on user permissions
  // Include permissions in deps to ensure re-render when context token changes
  const navSections = useMemo(
    () => [
      { key: 'top', items: filterNavItems(navItemsTop) },
      { key: 'bottom', items: filterNavItems(navItemsBottom) },
    ],
    [filterNavItems, permissions],
  );

  return (
    <Providers>
      <PageTracker category="helpdesk" />
      <Suspense fallback={<PageSpinner title="Loading..." />}>
        {isAuthenticated && (
          <TopNavbar
            data-testid={TEST_IDS.navbar.top}
            config={{ identityBaseUrl: __IDENTITY_BASE_URL__ || '', app: 'helpdesk' }}
            onExtend={handleNavExtend}
            logoComponent={<Logo />}
          />
        )}
      </Suspense>
      <div className="flex flex-1">
        {isAuthenticated && (
          <SideNav
            data-testid={TEST_IDS.navbar.side}
            sections={navSections}
            desktopMode={desktopMode}
            onDesktopModeChange={setDesktopMode}
            isMobileOpen={isMobileOpen}
            onMobileOpenChange={setIsMobileOpen}
            mobileHeader={<Logo />}
            renderLink={({ item, className, activeClassName, children }: { item: any, className: string, activeClassName: string, children: React.ReactNode }) => (
              <NavLink
                to={item.href}
                data-testid={item.testId}
                className={({ isActive }: { isActive: boolean }) => (isActive ? activeClassName : className)}
              >
                {children}
              </NavLink>
            )}
          />
        )}
        <div className="flex flex-1">
          <div className="flex w-0 min-w-full flex-col p-5 md:py-5">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </Providers>
  );
}
