import React, { useState, useEffect, Suspense, useMemo } from 'react';

import './index.css';

import { breadcrumbs } from '@/breadcrumbs';
import { Providers } from '@/providers';
import { registerStatusColors } from '@brainforgeau/components/page';

// Register helpdesk status color domains once at module load time.
// StatusBadge components anywhere in this MF resolve colors via this registry.
registerStatusColors({
  'knowledge-base.status': {
    Draft: 'default',
    Published: 'success',
    Archived: 'warning',
  },
  'ticket.status': {
    New: 'primary',
    InProgress: 'warning',
    Closed: 'default',
  },
  'ticket.priority': {
    None: 'default',
    Low: 'default',
    Normal: 'primary',
    High: 'warning',
    Critical: 'danger',
  },
  'automation.status': {
    Active: 'success',
    Draft: 'warning',
    Archived: 'default',
  },
});
import {
  ErrorBoundary,
  SideNav,
  type SideNavDesktopMode,
  useNavbarAction,
} from '@brainforgeau/components';
import {
  BreadcrumbRegistryProvider,
  PageTemplateProvider,
} from '@brainforgeau/components/page';
import {
  type GuardedItem,
  useAuth,
  usePermissions,
  useWhitelabel,
} from '@brainforgeau/security';
import { NavLink, Outlet, useLocation } from '@modern-js/runtime/router';

const TopNavbar = React.lazy(() =>
  import('@brainforgeau/navbar/Navbar').then(m => ({ default: m.TopNavbar })),
);
import { NavbarSkeleton } from '@/components/NavbarSkeleton';
import { Logo } from '@/components/Logo';
import { HelpdeskPermissions } from '@/constants/permissions';
import { TEST_IDS } from '@/constants/testIds';
import { PageTracker } from '@/observability';
import { hubConnectedAtom } from '@/state/config';
import { getAppConfig } from '@/state/config';
import { SignalIcon } from '@heroicons/react/24/solid';
import { useAtomValue } from 'jotai';

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
  {
    label: 'Ideas Forum',
    href: '/ideas',
    icon: 'light-bulb',
    testId: 'nav-ideas',
    requiredPermissions: [HelpdeskPermissions.TicketRead],
  },
];

const navItemsBottom: GuardedItem<NavItem>[] = [
  // Principal Picker + helpdesk principal routes are accessible via /principal/{id}/*
  {
    label: 'Configuration',
    icon: 'settings',
    testId: 'nav-configuration',
    children: [
      {
        label: 'Ticket Categories',
        href: '/configuration/categories',
        icon: 'folder',
        testId: 'nav-configuration-categories',
        requiredPermissions: [HelpdeskPermissions.Settings.Read],
      },
      {
        label: 'Custom Statuses',
        href: '/configuration/custom-statuses',
        icon: 'tag',
        testId: 'nav-configuration-custom-statuses',
        requiredPermissions: [HelpdeskPermissions.Settings.Manage],
      },
      {
        label: 'Custom Priorities',
        href: '/configuration/custom-priorities',
        icon: 'flag',
        testId: 'nav-configuration-custom-priorities',
        requiredPermissions: [HelpdeskPermissions.Settings.Manage],
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
        href: '/configuration/automations',
        icon: 'cpu-chip',
        testId: 'nav-configuration-automations',
        requiredPermissions: [HelpdeskPermissions.Settings.Read],
      },
      {
        label: 'Workflows',
        href: '/configuration/workflows',
        icon: 'arrows-right-left',
        testId: 'nav-configuration-workflows',
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
      {
        label: 'Integrations',
        href: '/configuration/integrations',
        icon: 'puzzle-piece',
        testId: 'nav-configuration-integrations',
        requiredPermissions: [HelpdeskPermissions.Settings.Manage],
      },
      {
        label: 'Live Chat',
        href: '/configuration/live-chat',
        icon: 'chat-bubble-left-right',
        testId: 'nav-configuration-live-chat',
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
        <span
          className="flex items-center gap-1 text-green-500"
          title="Live connection active"
        >
          <SignalIcon className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
};

export default function Layout() {
  // Desktop sidebar: extended (full) or collapsed (icons only)
  const [desktopMode, setDesktopMode] =
    useState<SideNavDesktopMode>('extended');
  // Mobile drawer: closed by default
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleDesktopMode = () => {
    setDesktopMode(prev => (prev === 'extended' ? 'collapsed' : 'extended'));
  };

  // Handle hamburger menu click - toggle desktop mode on desktop, open drawer on mobile
  const handleNavExtend = () => {
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      setIsMobileOpen(true);
    } else {
      toggleDesktopMode();
    }
  };

  const appConfig = getAppConfig();

  const { isAuthenticated } = useAuth();
  const { filterNavItems, permissions } = usePermissions();
  const location = useLocation();
  const { setAction } = useNavbarAction();

  const { config: whitelabelConfig, isLoading: whitelabelLoading } =
    useWhitelabel();
  const brandName = whitelabelConfig?.branding?.appTitle ?? 'BrainForge';

  // Detect principal-scoped routes — hides tenant sidenav, mirrors billing-mf pattern
  const isPrincipalRoute = useMemo(
    () => location.pathname.startsWith('/principal/'),
    [location.pathname],
  );

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
      <PageTemplateProvider brandName={brandName} isLoading={whitelabelLoading}>
        <BreadcrumbRegistryProvider
          registry={breadcrumbs}
          renderLink={({ item, className, children }) => (
            <NavLink to={item.href} className={className}>{children}</NavLink>
          )}
        >
          <PageTracker category="helpdesk" />
          <ErrorBoundary>
            <Suspense fallback={<NavbarSkeleton />}>
              {isAuthenticated && (
                <TopNavbar
                  data-testid={TEST_IDS.navbar.top}
                  config={{
                    identityBaseUrl: appConfig?.identityBaseUrl || '',
                    notificationHubUrl: appConfig?.api?.signalRHubUrl || '',
                    notificationApiUrl: appConfig?.api?.notificationUrl || '',
                    app: 'helpdesk',
                  }}
                  onExtend={handleNavExtend}
                  logoComponent={<Logo hideOnMobile />}
                />
              )}
            </Suspense>
          </ErrorBoundary>
          <div className="flex flex-1">
            {isAuthenticated && !isPrincipalRoute && (
              <SideNav
                data-testid={TEST_IDS.navbar.side}
                sections={navSections}
                desktopMode={desktopMode}
                onDesktopModeChange={setDesktopMode}
                isMobileOpen={isMobileOpen}
                onMobileOpenChange={setIsMobileOpen}
                mobileHeader={<Logo />}
                renderLink={({
                  item,
                  className,
                  activeClassName,
                  children,
                }: {
                  item: any;
                  className: string;
                  activeClassName: string;
                  children: React.ReactNode;
                }) => (
                  <NavLink
                    to={item.href}
                    data-testid={item.testId}
                    className={({ isActive }: { isActive: boolean }) =>
                      isActive ? activeClassName : className
                    }
                  >
                    {children}
                  </NavLink>
                )}
              />
            )}
            {isPrincipalRoute ? (
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            ) : (
              <div className="flex flex-1">
                <ErrorBoundary>
                  <Outlet />
                </ErrorBoundary>
              </div>
            )}
          </div>
        </BreadcrumbRegistryProvider>
      </PageTemplateProvider>
    </Providers>
  );
}
