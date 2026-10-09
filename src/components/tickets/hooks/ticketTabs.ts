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
 * The assignee selection (`assigneeId`, `includeUnassigned`) is deliberately
 * NOT in here. It belongs to the Assignee filter, so it survives a tab change
 * like every other filter. The two tabs that define themselves in terms of a
 * person set it explicitly below, which is also what the Assignee filter then
 * shows.
 */
type TabOwnedField = 'status' | 'customStatusIds' | 'overdueOnly';

/** The statuses a ticket can still be picked up in. */
const OPEN_STATUSES = [TicketStatus.New, TicketStatus.InProgress];

/**
 * The tabs that ARE an assignee selection: "Unassigned" is the Assignee
 * filter's Unassigned option alone (on open tickets), and "Assigned to you" is
 * the current user alone. Choosing that selection in the filter opens the tab,
 * and opening the tab sets the filter to it.
 */
export const isPersonTab = (tabKey: string) =>
  tabKey === 'unassigned' || tabKey === 'assigned-to-you';

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
    // Custom statuses are part of the status selection, which a tab owns.
    customStatusIds: _customStatusIds,
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
      // The Assignee filter's Unassigned option on its own, so the filter shows
      // exactly what the tab means. Chosen people are replaced rather than
      // kept: with them the list would no longer be nobody's tickets.
      //
      // Constrained to open statuses as well. Unassigned on its own means "no
      // assignee, any status", which swept in closed tickets: 144 of the 453
      // this tab used to show. A closed ticket cannot be picked up, so counting
      // it in a triage queue overstates the work by a third and makes the
      // number useless for deciding what to do next.
      return {
        ...carried,
        assigneeId: undefined,
        includeUnassigned: true,
        status: [...OPEN_STATUSES],
      };
    case 'overdue':
      return { ...carried, overdueOnly: true };
    case 'assigned-to-you':
      // This tab IS an assignee filter, so it replaces whoever the Assignee
      // filter has selected rather than intersecting with them.
      return {
        ...carried,
        assigneeId: currentUserId ? [currentUserId] : undefined,
        includeUnassigned: undefined,
      };
    default:
      return { ...carried };
  }
};

const sameSet = (a?: readonly unknown[], b?: readonly unknown[]) => {
  const x = [...(a ?? [])].map(String).sort();
  const y = [...(b ?? [])].map(String).sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

/**
 * The tab that describes these filters, so the highlighted tab follows the
 * filter bar as well as the other way round.
 *
 * Clicking a tab writes its fields into the filters (Unanswered sets Status to
 * New), but editing those fields afterwards left the tab lit: clear New from
 * Status and the list showed every status under a tab still saying Unanswered.
 *
 * The Assignee filter decides first, because two tabs are an assignee
 * selection (isPersonTab):
 *   - exactly you, with no status or Overdue chosen, is "Assigned to you";
 *   - only Unassigned, with exactly the open statuses, is "Unassigned". So is
 *     only Unassigned with no status, but only when it was just chosen in
 *     the Assignee filter (`previous` differs): the caller then applies the
 *     tab's definition (filtersForTab), which adds the open statuses, so the
 *     tab and its badge describe the rows. Otherwise clearing those statuses
 *     on the Unassigned tab would put them straight back. A status the user
 *     did choose (Closed, say) is never overridden.
 * Otherwise the current tab is kept while the filters still match its
 * definition, then the first tab whose definition they match exactly, and All
 * when none does.
 */
export const tabForFilters = (
  filters: TicketFilters,
  currentTab: string,
  currentUserId?: string,
  /** The filters before this change, to tell a new assignee selection apart. */
  previous?: TicketFilters,
): TicketTabKey => {
  const people = filters.assigneeId ?? [];
  const assigneesJustChosen =
    previous !== undefined &&
    (!sameSet(previous.assigneeId, filters.assigneeId) ||
      Boolean(previous.includeUnassigned) !==
        Boolean(filters.includeUnassigned));
  const noOtherTabFields =
    !filters.overdueOnly && !filters.customStatusIds?.length;
  if (
    noOtherTabFields &&
    currentUserId &&
    !filters.includeUnassigned &&
    people.length === 1 &&
    people[0] === currentUserId &&
    !filters.status?.length
  )
    return 'assigned-to-you';
  if (
    noOtherTabFields &&
    filters.includeUnassigned &&
    people.length === 0 &&
    (sameSet(filters.status, OPEN_STATUSES) ||
      (assigneesJustChosen && !filters.status?.length))
  )
    return 'unassigned';

  const matches = (key: TicketTabKey) => {
    // The person tabs were decided above; anything that reached here is not
    // their selection.
    if (isPersonTab(key)) return false;
    const definition = filtersForTab(key, filters, currentUserId);
    return (
      sameSet(definition.status, filters.status) &&
      sameSet(definition.customStatusIds, filters.customStatusIds) &&
      Boolean(definition.overdueOnly) === Boolean(filters.overdueOnly)
    );
  };
  if (TICKET_VALID_TABS.has(currentTab) && matches(currentTab as TicketTabKey))
    return currentTab as TicketTabKey;
  const candidates: TicketTabKey[] = ['unanswered', 'unclosed', 'overdue'];
  return candidates.find(matches) ?? 'all';
};
