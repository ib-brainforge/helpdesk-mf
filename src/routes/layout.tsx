import type React from 'react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { RouteGuard } from './route-permissions';

// css-base-split: helpdesk-mf's single, permanent base stylesheet —
// precompiled Tailwind preflight + @brainforgeau/theme tokens (`:root`) +
// HeroUI vars + body/portal/toast/dropdown/scrollbar rules (see
// @brainforgeau/theme README "Consumer usage"). UNCONDITIONAL import (not
// gated on `__HELPDESK_STANDALONE__`/`__BF_SHELL_HOST__`) because this same
// layout.tsx renders BOTH helpdesk-mf's standalone entry AND its federated
// `export-app` — both import `@modern-js/runtime/registry/main`, the same
// route tree rooted at this layout. Standalone, this is exactly what
// renders base+utilities together, byte-identical to the pre-split
// combined sheet. Embedded under the shell, the shell's own
// `useRemoteStylesheets` permanently disables this link once it identifies
// helpdesk's `base.<hash>.css` chunk (see modern.config.ts's `base`
// splitChunks cacheGroup, which routes this import into that dedicated,
// positively-matchable chunk) — no `isEmbedded`/env branch needed here,
// suppression happens entirely on the shell side. Ordered BEFORE
// './index.css' so, in the rare case a rule in base and a rule in
// helpdesk's own utilities/component CSS ever target the same selector,
// helpdesk's own sheet (loaded after) wins the cascade — matching "base is
// the floor, app CSS can layer on top" (mirrors hr-mf's own
// routes/layout.tsx, the reference implementation of this import order).
import '@brainforgeau/theme/base.css';
import './index.css';

import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
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
  // Kept in step with getStatusConfig in components/tickets/ticket-status-config.
  // This registry entry has no consumer today (ticket badges pass an explicit
  // colour), but it disagreed with the real mapping on Closed, so anyone who
  // did start using it would have got a different colour than the grid shows.
  'ticket.status': {
    New: 'warning',
    InProgress: 'success',
    Closed: 'default',
  },
  // Kept in step with getPriorityConfig in components/tickets/ticket-priority-config.
  'ticket.priority': {
    None: 'default',
    Low: 'default',
    Normal: 'success',
    High: 'warning',
    Critical: 'danger',
  },
  'automation.status': {
    Active: 'success',
    Draft: 'warning',
    Archived: 'default',
  },
});
import { renderBreadcrumbLink } from '@/components/Breadcrumbs';
import {
  LicenseGuard,
  PreviewRoleSlot,
  useAuth,
  usePermissions,
  useWhitelabel,
} from '@/security';
import {
  ErrorBoundary,
  SideNav,
  type SideNavDesktopMode,
  lazyWithRetry,
  useNavbarAction,
} from '@brainforgeau/components';
import {
  BreadcrumbRegistryProvider,
  PageTemplateProvider,
} from '@brainforgeau/components/page';
import {
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from '@modern-js/runtime/router';

const TopNavbar = lazyWithRetry(
  () => import('@brainforgeau/navbar/Navbar'),
  m => m?.TopNavbar,
);
import { Logo } from '@/components/Logo';
import { HelpdeskNavbarAction } from '@/components/NavbarAction';
import { NavbarSkeleton } from '@/components/NavbarSkeleton';
import { TEST_IDS } from '@/constants/testIds';
import { PageTracker } from '@/observability';
import { getAppConfig } from '@/state/config';
import { WORKSPACE_FALLBACK_PATH, useWorkspaces } from '@/workspaces';

const MOBILE_BREAKPOINT = 1024;

/**
 * Maps every breadcrumb labelKey used in breadcrumbs.ts to its intended leaf
 * display label. Without this, BreadcrumbRegistryProvider falls back to
 * humanise() which title-cases every dot-separated segment of the full key.
 * REVIEW: Plain JS object lookup — no i18n library dependency needed.
 */
const BREADCRUMB_LABELS: Record<string, string> = {
  helpdesk: 'Helpdesk',
  'helpdesk.dashboard': 'Dashboard',
  'helpdesk.satisfaction': 'Satisfaction',
  'helpdesk.ideas': 'Ideas',
  'helpdesk.tickets': 'Tickets',
  'helpdesk.tickets.new': 'New Ticket',
  'helpdesk.configuration': 'Configuration',
  'helpdesk.configuration.categories': 'Categories',
  'helpdesk.configuration.categories.new': 'New Category',
  'helpdesk.configuration.custom-statuses': 'Custom Statuses',
  'helpdesk.configuration.custom-priorities': 'Custom Priorities',
  'helpdesk.configuration.company-deadlines': 'Company Deadlines',
  'helpdesk.configuration.custom-fields': 'Custom Fields',
  'helpdesk.configuration.canned-responses': 'Canned Responses',
  'helpdesk.configuration.integrations': 'Integrations',
  'helpdesk.configuration.live-chat': 'Live Chat',
  'helpdesk.configuration.import-export': 'Import & Export',
  'helpdesk.configuration.approval-workflows': 'Approval Workflows',
  'helpdesk.configuration.approval-workflows.new': 'New Workflow',
  'helpdesk.configuration.automations': 'Automations',
  'helpdesk.configuration.workflows': 'Workflows',
  'helpdesk.configuration.workflows.rule-migration-report':
    'Rule Migration Report',
  'helpdesk.reports': 'Reports',
  'helpdesk.reports.satisfaction': 'Satisfaction',
  'helpdesk.reports.deleted': 'Deleted',
  'helpdesk.reports.audit': 'Audit',
  'helpdesk.reports.assets': 'Assets',
  'helpdesk.approvals': 'Approvals',
  'helpdesk.approvals.new': 'New Approval',
  'helpdesk.admin': 'Admin',
  'helpdesk.admin.settings': 'Settings',
  'helpdesk.admin.users': 'Users',
  'helpdesk.knowledge-base': 'Knowledge Base',
  'helpdesk.knowledge-base.new': 'New Article',
  'helpdesk.knowledge-base.edit': 'Edit',
  'helpdesk.knowledge-base.search': 'Search',
  'helpdesk.knowledge-base.settings': 'Settings',
  'helpdesk.settings': 'Settings',
  'it-support': 'IT Support',
  'it-support.remote-sessions': 'Remote sessions',
};

function breadcrumbI18nResolver(key: string): string {
  return BREADCRUMB_LABELS[key] ?? key;
}

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

  // pilot(shell-host): when helpdesk-mf's export-app is mounted inside the
  // app shell, do NOT render helpdesk-mf's own TopNavbar — the shell owns
  // the ONE persistent TopNavbar instance across every route (shell
  // dashboard AND every embedded remote), mounted OUTSIDE this remote's
  // tree so shell <-> /helpdesk navigation never remounts it (see app's
  // src/routes/layout.tsx). helpdesk-mf's SideNav and all other chrome
  // below is unaffected. Layout here is plain flexbox (no fixed/sticky top
  // offset reserved for the navbar's height), so skipping this element
  // simply lets the SideNav/Outlet below reflow to fill the space — no
  // extra height/offset compensation needed, unlike a fixed-position
  // navbar would require.
  const isEmbedded =
    typeof window !== 'undefined' && (window as any).__BF_SHELL_HOST__ === true;

  // pilot(shell-host): when embedded, the shell's TopNavbar owns the
  // sidenav expand/collapse button (skipping this remote's TopNavbar block
  // below took its `onExtend` wiring with it). The shell can't reach into
  // this remote's SideNav state, so its button broadcasts the
  // `bf:shell-nav-extend` window CustomEvent (see app's
  // src/routes/layout.tsx) and this embedded-only listener bridges it to
  // the SAME handleNavExtend the standalone TopNavbar's `onExtend` prop
  // calls. Standalone (isEmbedded false) registers nothing — behavior
  // unchanged.
  useEffect(() => {
    if (!isEmbedded) return undefined;
    window.addEventListener('bf:shell-nav-extend', handleNavExtend);
    return () =>
      window.removeEventListener('bf:shell-nav-extend', handleNavExtend);
  }, [isEmbedded, handleNavExtend]);

  const { isAuthenticated } = useAuth();
  const { filterNavItems, permissions } = usePermissions();
  const location = useLocation();
  const { setAction } = useNavbarAction();
  const navigate = useNavigate();
  // Which workspace the URL is in picks the side menu, and opening one the
  // user cannot use redirects (workspaces.ts).
  const {
    active: workspace,
    available: workspaces,
    blocked: workspaceBlocked,
    isLoading: loadingWorkspaces,
  } = useWorkspaces(location.pathname);

  const { config: whitelabelConfig, isLoading: whitelabelLoading } =
    useWhitelabel();
  const brandName = whitelabelConfig?.branding?.appTitle ?? 'BrainForge';

  // Detect principal-scoped routes — hides tenant sidenav, mirrors billing-mf pattern
  const isPrincipalRoute = useMemo(
    () => location.pathname.startsWith('/principal/'),
    [location.pathname],
  );

  // The navbar draws this outside Helpdesk's router, so it gets navigate and
  // the active workspace from here, and is set again whenever they change.
  useEffect(() => {
    setAction(
      <HelpdeskNavbarAction
        workspaces={workspaces}
        activeKey={workspace.key}
        onNavigate={navigate}
      />,
    );
  }, [setAction, workspaces, workspace.key, navigate]);
  // Cleared once, on leaving Helpdesk, not between the updates above.
  useEffect(() => () => setAction(null), [setAction]);

  // Filter navigation items based on user permissions
  // Include permissions in deps to ensure re-render when context token changes
  const navSections = useMemo(
    () => [
      { key: 'top', items: filterNavItems(workspace.nav.top) },
      { key: 'bottom', items: filterNavItems(workspace.nav.bottom) },
    ],
    [filterNavItems, permissions, workspace],
  );

  // Someone whose role reaches only the Tickets page (a Customer, Platform
  // Support, a Principal Agent) gets no side menu at all: a menu with one
  // entry is just a frame around the page they are already on.
  // Counted by destination, not by entry: a group such as Configuration can
  // survive filtering with none of its pages left in it.
  const countDestinations = (items: unknown[]): number =>
    items.reduce<number>((n, item) => {
      const { href, children } = item as {
        href?: string;
        children?: unknown[];
      };
      return n + (href ? 1 : 0) + (children ? countDestinations(children) : 0);
    }, 0);
  const hasSideMenu =
    navSections.reduce(
      (n, section) => n + countDestinations(section.items),
      0,
    ) > 1;

  return (
    <Providers>
      <PageTemplateProvider brandName={brandName} isLoading={whitelabelLoading}>
        <BreadcrumbRegistryProvider
          registry={breadcrumbs}
          // REVIEW: i18nResolver maps each full labelKey to its intended leaf label so
          // breadcrumbs show "Email Settings" not "Helpdesk Configuration Email Settings".
          i18nResolver={breadcrumbI18nResolver}
          renderLink={renderBreadcrumbLink}
        >
          <PageTracker category="helpdesk" />
          {!isEmbedded && (
            <ErrorBoundary>
              <Suspense fallback={<NavbarSkeleton />}>
                {isAuthenticated && (
                  <TopNavbar
                    data-testid={TEST_IDS.navbar.top}
                    config={{
                      // Named per-service keys, resolved `rc ?? baked` in
                      // src/state/config (which console.errors each by name
                      // when missing). `notificationHubUrl` is the NOTIFICATION
                      // bell hub: it used to be handed `api.signalRHubUrl`,
                      // which was helpdesk-backend's OWN ticket hub — the bell
                      // was subscribing to the wrong service entirely.
                      identityBaseUrl: appConfig.identityApiBaseUrl,
                      notificationHubUrl: appConfig.notificationSignalRHubUrl,
                      notificationApiUrl: appConfig.notificationApiBaseUrl,
                      app: 'helpdesk',
                    }}
                    onExtend={handleNavExtend}
                    logoComponent={<Logo hideOnMobile />}
                  />
                )}
              </Suspense>
            </ErrorBoundary>
          )}
          <div className="flex flex-1">
            {isAuthenticated && !isPrincipalRoute && hasSideMenu && (
              <SideNav
                data-testid={TEST_IDS.navbar.side}
                sections={navSections}
                // SideNav renders this as the version label pinned at the
                // bottom of the nav, the same "x.y.z-develop.<sha>" line the
                // other apps show. It lives in the nav rather than the page so
                // it costs no vertical space in any route's content area.
                //
                // Suppressed when the build injected no version: local dev
                // leaves it as the literal string "unknown", and a nav footer
                // reading "unknown" looks like a defect rather than a build id.
                version={
                  appConfig.version && appConfig.version !== 'unknown'
                    ? appConfig.version
                    : undefined
                }
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
                    end={item.end}
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
            {/* A column so the development-only "Preview as role" banner can
                sit across the top of the content. Each branch below keeps
                the same row it always had. In production PreviewRoleSlot
                renders nothing. */}
            <div className="flex flex-1 min-w-0 flex-col">
              {isAuthenticated && <PreviewRoleSlot />}
              {isPrincipalRoute ? (
                <div className="flex flex-1">
                  <ErrorBoundary>
                    <LicenseGuard appId="helpdesk">
                      <Outlet />
                    </LicenseGuard>
                  </ErrorBoundary>
                </div>
              ) : (
                <div className="flex flex-1 min-w-0">
                  <ErrorBoundary>
                    <LicenseGuard appId="helpdesk">
                      {/* A workspace the user cannot open (switched off, or
                        not their role) sends them to Tickets; nothing renders
                        while roles are still loading, so an admin is never
                        bounced. Page permissions: routes/route-permissions.tsx. */}
                      {workspaceBlocked ? (
                        loadingWorkspaces ? null : (
                          <Navigate to={WORKSPACE_FALLBACK_PATH} replace />
                        )
                      ) : (
                        <RouteGuard pathname={location.pathname}>
                          <Outlet />
                        </RouteGuard>
                      )}
                    </LicenseGuard>
                  </ErrorBoundary>
                </div>
              )}
            </div>
          </div>
        </BreadcrumbRegistryProvider>
      </PageTemplateProvider>
    </Providers>
  );
}
