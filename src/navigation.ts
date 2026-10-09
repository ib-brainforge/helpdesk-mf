/**
 * The side menu of each workspace (see workspaces.ts, which picks one by URL).
 * Kept out of routes/layout.tsx so the layout only decides which menu to
 * show, not what is in it.
 */
import { PRINCIPAL_ADMIN_ROLES } from '@/hooks/usePrincipalAccess';
import { ruleForPath } from '@/routes/route-permissions';
import type { GuardedItem } from '@brainforgeau/security';

export interface NavItem {
  label: string;
  href?: string;
  icon: string;
  testId?: string;
  /** Active only on this exact URL, not on the pages below it. */
  end?: boolean;
  children?: NavItem[];
}

/** The two halves of a side menu: pages at the top, settings at the bottom. */
export interface NavSections {
  top: GuardedItem<NavItem>[];
  bottom: GuardedItem<NavItem>[];
}

/**
 * A menu item needs the same permission as the page it opens, taken from the
 * route table (routes/route-permissions.tsx), so the menu never offers a page
 * that would say Access Denied, and never hides one the user may open. Items
 * whose page has no rule stay visible. Groups (Configuration) are hidden by
 * the shell when none of their children survive.
 */
const withRoutePermissions = (
  items: GuardedItem<NavItem>[],
): GuardedItem<NavItem>[] =>
  items.map(item => {
    const children = (item as { children?: GuardedItem<NavItem>[] }).children;
    const href = (item as { href?: string }).href;
    const rule = href ? ruleForPath(href) : undefined;
    return {
      ...item,
      ...(children ? { children: withRoutePermissions(children) } : {}),
      ...(rule ? { requiredPermissions: rule.anyOf } : {}),
    };
  });

/** Helpdesk, the ticketing workspace. */
export const HELPDESK_NAV: NavSections = {
  top: withRoutePermissions([
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: 'grids',
      testId: 'nav-dashboard',
    },
    {
      label: 'Tickets',
      href: '/tickets',
      icon: 'text',
      testId: 'nav-tickets',
    },
    {
      label: 'Knowledge Base',
      href: '/knowledge-base',
      icon: 'learning',
      testId: 'nav-knowledge-base',
    },
    {
      label: 'Reports',
      href: '/reports',
      icon: 'analytics',
      testId: 'nav-reports',
    },
    // Ideas Forum is deliberately NOT linked here. The publish/unpublish path and
    // the /ideas feed both work, but voting and commenting do not exist at any
    // layer: GetIdeasQueryHandler returns a hardcoded 0 for VoteCount and there
    // is no vote table. Giving a read-only list the same prominence as Tickets
    // made a half-built feature look broken. The route is left in place, so the
    // page is still reachable directly and nothing is deleted.
  ]),
  bottom: withRoutePermissions([
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
        },
        {
          label: 'Custom Statuses',
          href: '/configuration/custom-statuses',
          icon: 'tag',
          testId: 'nav-configuration-custom-statuses',
        },
        {
          label: 'Custom Priorities',
          href: '/configuration/custom-priorities',
          icon: 'flag',
          testId: 'nav-configuration-custom-priorities',
        },
        {
          // Netcorp staff only: deadlines are set per company by the principal,
          // never by the company itself, and the API takes principal admin to
          // save. The page checks the same roles.
          label: 'Company Deadlines',
          href: '/configuration/company-deadlines',
          icon: 'clock',
          testId: 'nav-configuration-company-deadlines',
          requiredRoles: [...PRINCIPAL_ADMIN_ROLES],
        },
        {
          label: 'Automation',
          href: '/configuration/automations',
          icon: 'cube',
          testId: 'nav-configuration-automations',
        },
        {
          label: 'Workflows',
          href: '/configuration/workflows',
          icon: 'matching',
          testId: 'nav-configuration-workflows',
        },
        // Integrations and Live Chat are hidden, not deleted. Their pages now live
        // in components/integrations/IntegrationsConfigPage.tsx and
        // components/live-chat/LiveChatConfigPage.tsx with no route, so the URL
        // is gone too. Each file's header says how to bring it back.
        // {
        //   label: 'Integrations',
        //   href: '/configuration/integrations',
        //   icon: 'plug',
        //   testId: 'nav-configuration-integrations',
        // },
        // {
        //   label: 'Live Chat',
        //   href: '/configuration/live-chat',
        //   icon: 'chatO',
        //   testId: 'nav-configuration-live-chat',
        // },
      ],
    },
  ]),
};

/**
 * IT Support, the remote support workspace under /it-support. Both pages are
 * placeholders until remote access lands. Who may open the workspace at all
 * is decided once, in workspaces.ts, so the items carry no rules of their own.
 */
export const IT_SUPPORT_NAV: NavSections = {
  top: [
    {
      label: 'Overview',
      href: '/it-support',
      end: true,
      icon: 'grids',
      testId: 'nav-it-support-overview',
    },
    {
      label: 'Remote sessions',
      href: '/it-support/remote-sessions',
      icon: 'pc',
      testId: 'nav-it-support-remote-sessions',
    },
  ],
  bottom: [],
};
