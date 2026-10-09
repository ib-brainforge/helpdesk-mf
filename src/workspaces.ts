/**
 * Workspaces: Helpdesk (ticketing, today's app) and IT Support (remote access
 * to client PCs, coming), switched from the navbar the way Tracking switches
 * between Dashboard and Map. A workspace is a URL prefix with its own side
 * menu; see design-review/notes/WORKSPACES.md.
 *
 * This list is the only place that says what a workspace is. The navbar
 * switcher, the side menu and the route guard (all in routes/layout.tsx) read
 * it through useWorkspaces, so adding or gating a workspace is an edit here.
 */
import { IT_SUPPORT_WORKSPACE_ENABLED } from '@/constants/features';
import { PRINCIPAL_ADMIN_ROLES } from '@/hooks/usePrincipalAccess';
import { HELPDESK_NAV, IT_SUPPORT_NAV, type NavSections } from '@/navigation';
import { usePermissions } from '@brainforgeau/security';
import { ComputerDesktopIcon, TicketIcon } from '@heroicons/react/24/outline';
import { type ComponentType, type SVGProps, useMemo } from 'react';

export interface Workspace {
  key: 'helpdesk' | 'it-support';
  label: string;
  /**
   * An outline icon, the thin line style Tracking uses for its own mode
   * buttons, so the two apps' switchers read the same.
   */
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /**
   * Its URLs: the prefix itself and everything below it. Null for Helpdesk,
   * which owns every URL no other workspace claims.
   */
  prefix: string | null;
  /** Where the switcher goes. */
  home: string;
  enabled: boolean;
  /** Any one of these roles opens it. None listed: anyone who can open the app. */
  requiredRoles?: readonly string[];
  nav: NavSections;
  testId: string;
}

export const WORKSPACES: readonly Workspace[] = [
  {
    key: 'helpdesk',
    label: 'Helpdesk',
    icon: TicketIcon,
    prefix: null,
    // The landing redirect, which picks Dashboard or Tickets by permission.
    home: '/',
    enabled: true,
    nav: HELPDESK_NAV,
    testId: 'nav-workspace-helpdesk',
  },
  {
    key: 'it-support',
    label: 'IT Support',
    icon: ComputerDesktopIcon,
    prefix: '/it-support',
    home: '/it-support',
    enabled: IT_SUPPORT_WORKSPACE_ENABLED,
    // Netcorp staff, the same check as Company Deadlines.
    requiredRoles: PRINCIPAL_ADMIN_ROLES,
    nav: IT_SUPPORT_NAV,
    testId: 'nav-workspace-it-support',
  },
];

const DEFAULT_WORKSPACE = WORKSPACES[0];

/** Where someone is sent when they open a workspace they cannot use. */
export const WORKSPACE_FALLBACK_PATH = '/tickets';

/** The workspace a URL belongs to (pathname without the app's base path). */
export const workspaceForPath = (pathname: string): Workspace =>
  WORKSPACES.find(
    w =>
      w.prefix !== null &&
      (pathname === w.prefix || pathname.startsWith(`${w.prefix}/`)),
  ) ?? DEFAULT_WORKSPACE;

/**
 * The workspaces this user can open, and the one the URL is in.
 *
 * `blocked` is true when the URL belongs to a workspace that is switched off
 * or that the user's roles do not open; `active` is then Helpdesk, so the
 * side menu never shows a workspace the user is being sent away from. Roles
 * may still be loading (`isLoading`), in which case hold off on redirecting.
 */
export const useWorkspaces = (pathname: string) => {
  const { hasAnyRole, isLoading } = usePermissions();
  const available = useMemo(
    () =>
      WORKSPACES.filter(
        w =>
          w.enabled && (!w.requiredRoles || hasAnyRole([...w.requiredRoles])),
      ),
    [hasAnyRole],
  );
  const current = workspaceForPath(pathname);
  const blocked = !available.includes(current);
  return {
    active: blocked ? DEFAULT_WORKSPACE : current,
    available,
    blocked,
    isLoading,
  };
};
