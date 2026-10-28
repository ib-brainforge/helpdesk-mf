/**
 * The side menu of each view (see views.ts, which says which URLs belong to which).
 * Kept out of routes/layout.tsx so the layout only decides which menu to
 * show, not what is in it.
 */
import { HelpdeskPermissions } from '@/constants/permissions';
import { ruleForPath } from '@/routes/route-permissions';
import { RAISED_WITH_PROVIDER_PATH } from '@/views';
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

/** The Tenant view. */
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
    {
      // Hidden by the layout where the tenant has no provider above it.
      label: 'Raised with our provider',
      href: RAISED_WITH_PROVIDER_PATH,
      icon: 'chatO',
      testId: 'nav-provider-raised',
    },
    // Ideas Forum is deliberately NOT linked here. The publish/unpublish path and
    // the /ideas feed both work, but voting and commenting do not exist at any
    // layer: GetIdeasQueryHandler returns a hardcoded 0 for VoteCount and there
    // is no vote table. Giving a read-only list the same prominence as Tickets
    // made a half-built feature look broken. The route is left in place, so the
    // page is still reachable directly and nothing is deleted.
  ]),
  bottom: withRoutePermissions([
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
 * The Provider view: a provider's office working its tenants' tickets.
 * Items carry the permission of the page they open (the Provider.Support
 * permission for From tenants).
 */
export const PROVIDER_NAV: NavSections = {
  top: [
    {
      label: 'Dashboard',
      href: '/provider/dashboard',
      icon: 'grids',
      testId: 'nav-provider-dashboard',
      requiredPermissions: [HelpdeskPermissions.Reports.Read],
    },
    {
      label: 'From tenants',
      href: '/provider/tickets',
      icon: 'text',
      testId: 'nav-provider-tickets',
      requiredPermissions: [HelpdeskPermissions.Provider.Support],
    },
    {
      label: 'Tenant Deadlines',
      href: '/provider/deadlines',
      icon: 'clock',
      testId: 'nav-provider-deadlines',
      requiredPermissions: [HelpdeskPermissions.Provider.Support],
    },
    {
      label: 'Provider Categories',
      href: '/provider/categories',
      icon: 'tag',
      testId: 'nav-provider-categories',
      requiredPermissions: [HelpdeskPermissions.Provider.Support],
    },
    {
      label: 'Reports',
      href: '/provider/reports',
      icon: 'analytics',
      testId: 'nav-provider-reports',
      requiredPermissions: [HelpdeskPermissions.Reports.Read],
    },
  ],
  bottom: [],
};
