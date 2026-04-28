/**
 * PrincipalSidenav — left navigation for /principal/[principalId]/* routes.
 *
 * Always visible: Tickets, Reports
 * Admin-only:     SLA policies, Categories, Automation, Approvals, Settings
 */

import { useState } from 'react';
import {
  SideNav,
  SideNavDesktopMode,
  SideNavLinkRenderProps,
} from '@brainforgeau/components';
import { NavLink } from '@modern-js/runtime/router';
import type { PrincipalAccessLevel } from '@/hooks/usePrincipalAccess';

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

export function PrincipalSidenav({ principalId, level }: PrincipalSidenavProps) {
  const [desktopMode, setDesktopMode] = useState<SideNavDesktopMode>('extended');
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
      label: 'SLA policies',
      href: `${base}/sla-policies`,
      icon: 'clock',
      testId: 'nav-principal-sla-policies',
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
    {
      label: 'Approvals',
      href: `${base}/approvals`,
      icon: 'check-badge',
      testId: 'nav-principal-approvals',
    },
    {
      label: 'Settings',
      href: `${base}/settings`,
      icon: 'cog-6-tooth',
      testId: 'nav-principal-settings',
    },
  ];

  const items: NavItem[] = level === 'admin'
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
