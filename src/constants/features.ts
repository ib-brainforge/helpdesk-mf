/**
 * Product features that are switched off for now but kept in the code, so
 * turning one back on is a one-line change rather than a rewrite.
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
