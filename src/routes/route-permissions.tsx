import { HelpdeskPermissions as P } from '@/constants/permissions';
import { AccessDenied, usePermissions } from '@brainforgeau/security';
import type { FC, ReactNode } from 'react';

/**
 * Which permission each page needs, in one place.
 *
 * WHY A TABLE AND NOT A WRAPPER ON EACH PAGE
 * Ten Configuration pages wrapped themselves in withAuthorizationRequired and
 * the other fifty-odd pages checked nothing, so opening a URL you had no right
 * to showed the page anyway and the API refused its data, leaving it half
 * empty. A single table covers every page, makes the rules readable side by
 * side, and means a new page is guarded by the rule for its section unless it
 * says otherwise.
 *
 * HOW A RULE IS CHOSEN
 * Each page needs what the backend needs to load its main data (the
 * [RequireHelpdeskPermission] on that controller's GET), so the page and the
 * API agree. Management screens need the area's manage permission, since
 * editing is their whole purpose: categories need categories.manage, canned
 * responses comments.manage, approval workflows approvals.manage, and the rest
 * of Configuration settings.manage. Where several permissions are listed, any
 * one of them is enough.
 *
 * Rules are matched in order, first match wins, so more specific paths come
 * before the section they sit in. A path that matches no rule is not
 * restricted here.
 *
 * NOT COVERED
 * /principal/... pages are left out on purpose. The backend guards those by
 * principal membership (RequirePrincipalAccess), not by these permissions, and
 * a Helpdesk Principal Agent works principal tickets without principal.read.
 */
interface RouteRule {
  /** Matches the pathname, without the app's base path. */
  path: RegExp;
  /** Any one of these is enough. */
  anyOf: string[];
}

export const ROUTE_PERMISSIONS: RouteRule[] = [
  // Tickets
  { path: /^\/tickets\/new\/?$/, anyOf: [P.Tickets.Create] },
  { path: /^\/tickets(\/|$)/, anyOf: [P.Tickets.Read] },
  // The dashboard's figures come from the reports API (useTicketSummaryReport),
  // so it needs reports.read like the reports themselves. "/" only redirects
  // (to the dashboard, or to Tickets for people without reports) and needs no
  // rule of its own.
  { path: /^\/dashboard\/?$/, anyOf: [P.Reports.Read] },
  { path: /^\/ideas(\/|$)/, anyOf: [P.Tickets.Read] },

  // Knowledge base: internal, for the people who manage it (kb.manage, held by
  // Manager and Admin). Reading, writing and settings alike. Note identity
  // still grants kb.read to Customer and Technician, so the API itself would
  // answer them; making the knowledge base truly internal means removing that
  // from those roles in identity.
  { path: /^\/knowledge-base(\/|$)/, anyOf: [P.KnowledgeBase.Manage] },

  // Reports, including the satisfaction report under /reports/satisfaction.
  // NOT /satisfaction: that is the public survey a customer opens from the
  // emailed link, authorised by the token in the URL, so it has no rule here.
  { path: /^\/reports(-hub)?(\/|$)/, anyOf: [P.Reports.Read] },

  // Approvals
  { path: /^\/approvals(\/|$)/, anyOf: [P.Approvals.Read] },

  // Admin
  { path: /^\/admin\/users(\/|$)/, anyOf: [P.Users.Read] },
  { path: /^\/admin\/settings(\/|$)/, anyOf: [P.Settings.Read] },

  // Configuration, specific screens first
  { path: /^\/configuration\/categories(\/|$)/, anyOf: [P.Categories.Manage] },
  {
    path: /^\/configuration\/canned-responses(\/|$)/,
    anyOf: [P.Comments.Manage],
  },
  {
    path: /^\/configuration\/approval-workflows(\/|$)/,
    anyOf: [P.Approvals.Manage],
  },
  {
    path: /^\/configuration\/automations(\/|$)/,
    anyOf: [P.RuleGraphs.Read, P.Automation.Read],
  },
  { path: /^\/configuration\/workflows(\/|$)/, anyOf: [P.Workflows.Read] },
  {
    path: /^\/configuration\/(custom-statuses|custom-priorities|custom-fields|integrations|live-chat|import-export)(\/|$)/,
    anyOf: [P.Settings.Manage],
  },
  // The Configuration landing page lists every screen above; anyone who can
  // reach at least one of them may see it.
  {
    path: /^\/configuration\/?$/,
    anyOf: [
      P.Settings.Read,
      P.Categories.Manage,
      P.Comments.Manage,
      P.Approvals.Manage,
      P.Workflows.Read,
      P.RuleGraphs.Read,
      P.Automation.Read,
    ],
  },
];

/** The rule for a pathname, or undefined when the page is not restricted. */
export const ruleForPath = (pathname: string): RouteRule | undefined =>
  ROUTE_PERMISSIONS.find(rule => rule.path.test(pathname));

/**
 * Renders the page only when the user holds a permission its route needs,
 * otherwise the platform's Access Denied screen.
 *
 * Renders nothing while permissions are still loading (for example during a
 * context switch), the same as withAuthorizationRequired, so Access Denied
 * never flashes before the real answer is known. Elevated roles pass every
 * check inside hasAnyPermission.
 */
export const RouteGuard: FC<{ pathname: string; children: ReactNode }> = ({
  pathname,
  children,
}) => {
  const { hasAnyPermission, isLoading } = usePermissions();
  const rule = ruleForPath(pathname);
  if (!rule) return <>{children}</>;
  if (isLoading) return null;
  if (!hasAnyPermission(rule.anyOf)) {
    // Centred in the page area: the outlet sits in a flex row, so on its own
    // the panel hugged the left edge.
    return (
      <div className="flex min-h-[60vh] w-full flex-1 items-center justify-center p-6">
        <AccessDenied
          title="You don't have access to this page"
          message="Your role doesn't include the permission this page needs. Ask a Helpdesk admin if you think you should have it."
        />
      </div>
    );
  }
  return <>{children}</>;
};
