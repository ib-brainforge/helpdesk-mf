import { type TicketFilters, TicketStatus } from '@/types/ticket';

/**
 * What each ticket tab means, in one place.
 *
 * WHY THIS IS NOT IN TicketGrid ANY MORE
 * The grid turned a tab into filters for the list, and useTicketTabCounts
 * turned the same tab into filters for its badge, from a second hand-written
 * copy. The copies were only kept in step by a comment asking the next editor
 * to remember, and they had already drifted: the badges ignored every sidebar
 * and filter-bar selection, so picking an assignee narrowed the rows to that
 * person while every badge above them kept reporting the whole queue.
 *
 * One definition, used by both, is the only thing that makes a badge a
 * statement about the list it labels.
 */

/** Tab keys. The set below and this union must stay in step. */
export type TicketTabKey =
  | 'unanswered'
  | 'unclosed'
  | 'unassigned'
  | 'overdue'
  | 'assigned-to-you'
  | 'all';

export const TICKET_TAB_KEYS: readonly TicketTabKey[] = [
  'unanswered',
  'unclosed',
  'unassigned',
  'overdue',
  'assigned-to-you',
  'all',
];

/** URL query-param tab persistence: ?tab=<key>. */
export const TICKET_VALID_TABS = new Set<string>(TICKET_TAB_KEYS);

/**
 * Where the page opens when the URL names no tab.
 *
 * `all` applies no status filter, so the list starts as the whole queue rather
 * than silently pre-filtered to New. Landing on Unanswered meant the first
 * thing anyone saw was a subset, with a Status chip already set that they had
 * not chosen and had to notice before clearing.
 */
export const TICKET_DEFAULT_TAB: TicketTabKey = 'all';

/**
 * The fields a tab defines for itself. They are stripped from the incoming
 * filters and rebuilt per tab, so a previous tab's flags cannot leak into the
 * next one.
 *
 * `assigneeId` is deliberately NOT in here. It belongs to the sidebar rail and
 * the toolbar autocomplete, so it survives a tab change like every other
 * filter. The two tabs that define themselves in terms of a person override it
 * explicitly below.
 */
type TabOwnedField = 'status' | 'unassignedOnly' | 'overdueOnly';

/**
 * The filters a tab means, layered on whatever the sidebar and filter bar have
 * selected.
 *
 * Pure, so the grid and the badge counts can both call it and cannot disagree.
 *
 * Carrying the rest of the filters across a tab change is the point. Selecting
 * a person and then clicking Overdue asks "what of theirs is overdue", which is
 * the question the sidebar implies. Previously the carry-over was an allowlist
 * of five fields, which silently dropped the assignee, tenant, organisation and
 * division on every tab click.
 */
export const filtersForTab = (
  tabKey: string,
  filters: TicketFilters,
  currentUserId?: string,
): TicketFilters => {
  const {
    status: _status,
    unassignedOnly: _unassignedOnly,
    overdueOnly: _overdueOnly,
    ...carried
  } = filters as TicketFilters & Record<TabOwnedField, unknown>;

  switch (tabKey) {
    case 'unanswered':
      // Backend has no "unanswered" status; New is the closest proxy.
      return { ...carried, status: [TicketStatus.New] };
    case 'unclosed':
      return {
        ...carried,
        status: [TicketStatus.New, TicketStatus.InProgress],
      };
    case 'unassigned':
      // The dedicated unassignedOnly param; a magic assigneeId string is not
      // recognised by the endpoint.
      //
      // Constrained to open statuses as well. `unassignedOnly` on its own means
      // "no assignee, any status", which swept in closed tickets: 144 of the
      // 453 this tab used to show. A closed ticket cannot be picked up, so
      // counting it in a triage queue overstates the work by a third and makes
      // the number useless for deciding what to do next.
      //
      // A chosen assignee is cleared rather than sent alongside: "unassigned"
      // and "assigned to this person" match nothing together, and leaving it
      // set would keep that person highlighted in the rail while the list
      // showed tickets that are by definition nobody's.
      return {
        ...carried,
        assigneeId: undefined,
        unassignedOnly: true,
        status: [TicketStatus.New, TicketStatus.InProgress],
      };
    case 'overdue':
      return { ...carried, overdueOnly: true };
    case 'assigned-to-you':
      // This tab IS an assignee filter, so it overrides whoever the rail has
      // selected rather than intersecting with them.
      return {
        ...carried,
        assigneeId: currentUserId ? [currentUserId] : undefined,
      };
    default:
      return { ...carried };
  }
};
