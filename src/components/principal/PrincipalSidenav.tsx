/**
 * PrincipalSidenav — left navigation for /principal/[principalId]/* routes.
 *
 * Always visible: Tickets, Reports
 * Admin-only:     Company Deadlines, Categories, Automation, Approvals, Settings
 *                 (Approvals only while APPROVALS_ENABLED)
 */

import { APPROVALS_ENABLED } from '@/constants/features';
import type { PrincipalAccessLevel } from '@/hooks/usePrincipalAccess';
import {
  SideNav,
  type SideNavDesktopMode,
  type SideNavLinkRenderProps,
} from '@brainforgeau/components';
import { NavLink } from '@modern-js/runtime/router';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  testId?: string;
}

export interface PrincipalSidenavProps {
  principalId: string;
  level: PrincipalAccessLevel;
}

export function PrincipalSidenav({
  principalId,
  level,
}: PrincipalSidenavProps) {
  const [desktopMode, setDesktopMode] =
    useState<SideNavDesktopMode>('extended');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const base = `/principal/${principalId}`;

  const alwaysVisibleItems: NavItem[] = [
    {
      label: 'Tickets',
      href: `${base}/tickets`,
      icon: 'ticket',
      testId: 'nav-principal-tickets',
    },
    {
      label: 'Reports',
      href: `${base}/reports`,
      icon: 'chart-bar',
      testId: 'nav-principal-reports',
    },
  ];

  const adminOnlyItems: NavItem[] = [
    {
      // Deadlines are edited per company under Configuration, the one place
      // for them. This console's own SLA policy pages were retired.
      label: 'Company Deadlines',
      href: '/configuration/company-deadlines',
      icon: 'clock',
      testId: 'nav-principal-company-deadlines',
    },
    {
      label: 'Categories',
      href: `${base}/categories`,
      icon: 'folder',
      testId: 'nav-principal-categories',
    },
    {
      label: 'Automation',
      href: `${base}/automation`,
      icon: 'bolt',
      testId: 'nav-principal-automation',
    },
    // Switched off with the rest of approvals (APPROVALS_ENABLED).
    ...(APPROVALS_ENABLED
      ? [
          {
            label: 'Approvals',
            href: `${base}/approvals`,
            icon: 'check-badge',
            testId: 'nav-principal-approvals',
          },
        ]
      : []),
    {
      label: 'Settings',
      href: `${base}/settings`,
      icon: 'cog-6-tooth',
      testId: 'nav-principal-settings',
    },
  ];

  const items: NavItem[] =
    level === 'admin'
      ? [...alwaysVisibleItems, ...adminOnlyItems]
      : alwaysVisibleItems;

  const navSections = [
    {
      key: 'principal',
      items,
      header: null,
    },
  ];

  return (
    <SideNav
      data-testid="principal-sidenav"
      sections={navSections}
      desktopMode={desktopMode}
      onDesktopModeChange={setDesktopMode}
      isMobileOpen={isMobileOpen}
      onMobileOpenChange={setIsMobileOpen}
      renderLink={({
        item,
        className,
        activeClassName,
        children,
      }: SideNavLinkRenderProps) => (
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
  );
}
