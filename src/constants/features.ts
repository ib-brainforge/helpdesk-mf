/**
 * Product features behind a switch. Most are off for now but kept in the code,
 * so turning one back on (or off) is a one-line change rather than a rewrite.
 */

/**
 * Subtasks (child tickets): the "Add Subtask" action, the Subtasks panel on a
 * ticket, the "Subtask of" link and the "Create Subtask" automation action.
 * Off by product decision: Helpdesk does not work tickets as subtasks. While
 * off, the ticket page also skips fetching children and the parent ticket.
 */
export const SUBTASKS_ENABLED = false;

/**
 * Linked work items (ticket to ticket links): the "Link Ticket" action, the
 * Linked Work Items panel on a ticket and its picker. Off by product decision.
 * While off, the ticket page also skips fetching links.
 */
export const TICKET_LINKS_ENABLED = false;

/**
 * Approvals: the Approval card on a ticket, the Approvals pages (/approvals,
 * Configuration's /configuration/approval-workflows and the principal
 * console's /principal/:id/approvals) with their menu entry, the "Request
 * Approval" automation action and the "Require approval" step on a workflow
 * transition. Off by product decision: Helpdesk does not need approvals.
 * While off, the routes redirect away and nothing fetches approval data.
 */
export const APPROVALS_ENABLED = false;

/**
 * Time tracking: the time tracker panel on a ticket (timer and manual time
 * entries), the "Time Spent" field and the Time Spent column in custom
 * reports. Off by product decision. While off, the ticket page also skips
 * fetching time entries.
 */
export const TIME_TRACKING_ENABLED = false;

/**
 * The IT Support workspace: the Helpdesk / IT Support switcher in the navbar,
 * the /it-support pages and their own side menu (see src/workspaces.ts). On,
 * for principal admins only. While off, the switcher is hidden and every
 * /it-support URL redirects to Tickets.
 */
export const IT_SUPPORT_WORKSPACE_ENABLED = false;
