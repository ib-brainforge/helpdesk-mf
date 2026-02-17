import React, { useState, useEffect, Suspense, useMemo } from 'react';

import './index.css';

import { NavLink, Outlet, useLocation } from '@modern-js/runtime/router';
import { Providers } from '@/providers';
import { useAuth, usePermissions, type GuardedItem } from '@brainforgeau/security';
import { TopNavbar } from '@brainforgeau/navbar/Navbar';
import { ErrorBoundary, SideNav, SideNavDesktopMode, PageSpinner, useNavbarAction } from '@brainforgeau/components';
import { TEST_IDS } from '@/constants/testIds';
import { PageTracker } from '@/observability';
import { HelpdeskPermissions } from '@/constants/permissions';
import { useAtomValue } from 'jotai';
import { hubConnectedAtom } from '@/state/config';
import { SignalIcon } from '@heroicons/react/24/solid';
import { Logo } from '@/components/Logo';

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
  {
    label: 'Tickets',
    href: '/tickets',
    icon: 'ticket',
    testId: 'nav-tickets',
    requiredPermissions: [HelpdeskPermissions.TicketRead],
  },
  {
    label: 'Knowledge Base',
    href: '/knowledge-base',
    icon: 'book-open',
    testId: 'nav-knowledge-base',
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: 'chart-bar',
    testId: 'nav-reports',
  },
];

const navItemsBottom: GuardedItem<NavItem>[] = [
  // Platform Tickets and Tenant Viewer are now accessible via tabs on the /tickets page
  {
    label: 'Configuration',
    icon: 'settings',
    testId: 'nav-configuration',
    children: [
      {
        label: 'Categories',
        href: '/configuration/categories',
        icon: 'folder',
        testId: 'nav-configuration-categories',
        requiredPermissions: [HelpdeskPermissions.Settings.Read],
      },
      {
        label: 'Custom Fields',
        href: '/configuration/custom-fields',
        icon: 'adjustments-horizontal',
        testId: 'nav-configuration-custom-fields',
        requiredPermissions: [HelpdeskPermissions.Settings.Read],
      },
      {
        label: 'Automation',
        href: '/configuration/automation',
        icon: 'bolt',
        testId: 'nav-configuration-automation',
        requiredPermissions: [HelpdeskPermissions.Settings.Read],
      },
      {
        label: 'Email Templates',
        href: '/configuration/email-templates',
        icon: 'envelope',
        testId: 'nav-configuration-email-templates',
        requiredPermissions: [HelpdeskPermissions.Settings.Read],
      },
      {
        label: 'Email Settings',
        href: '/configuration/email',
        icon: 'envelope-open',
        testId: 'nav-configuration-email',
        requiredPermissions: [HelpdeskPermissions.Settings.Manage],
      },
    ],
  },
];

const HelpdeskAction = () => {
  const hubConnected = useAtomValue(hubConnectedAtom);
  return (
    <div className="flex items-center gap-1.5">
      {hubConnected && (
        <span className="flex items-center gap-1 text-green-500" title="Live connection active">
          <SignalIcon className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
};

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
  const { setAction } = useNavbarAction();

  useEffect(() => {
    setAction(<HelpdeskAction />);
    return () => setAction(null);
  }, [setAction]);

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
            logoComponent={<Logo hideOnMobile />}
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
