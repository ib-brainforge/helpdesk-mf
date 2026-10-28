import { type TicketFilters, TicketStatus } from '@/types/ticket';

/**
 * What each ticket tab means, in one place.
 *
 * Tabs answer "in what state". "Whose" belongs to the Assignee filter, which
 * survives every tab change and narrows every badge.
 *
 * "Assigned to you" is the one exception, and only a shortcut: it is your
 * open tickets, written into the filters as Status open and Assignee you,
 * both visible and removable like any other value. Change either and you are
 * off the tab. There are no other person special cases: "Unassigned" is the
 * Assignee filter's Unassigned option, not a tab.
 *
 * The keys are the old ones ("unanswered", "unclosed") so saved links keep
 * working; only the words changed.
 *
 * The grid and the badge counts both use `filtersForTab`, so a badge is always
 * a statement about the list it labels.
 */

/** Tab keys. The set below and this union must stay in step. */
export type TicketTabKey =
  | 'assigned-to-you'
  | 'unanswered'
  | 'unclosed'
  | 'overdue'
  | 'all';

export const TICKET_TAB_KEYS: readonly TicketTabKey[] = [
  'assigned-to-you',
  'unanswered',
  'unclosed',
  'overdue',
  'all',
];

/**
 * The tabs for someone who cannot work tickets (a tenant): their open
 * requests and all of them. New and Overdue are the team's queues.
 */
export const TENANT_TAB_KEYS: readonly TicketTabKey[] = ['unclosed', 'all'];

/** What each tab is called in the tab row (and its More menu). */
export const TICKET_TAB_LABELS: Record<TicketTabKey, string> = {
  'assigned-to-you': 'Assigned to you',
  unanswered: 'New',
  unclosed: 'Open',
  overdue: 'Overdue',
  all: 'All',
};

/** URL query-param tab persistence: ?tab=<key>. */
export const TICKET_VALID_TABS = new Set<string>(TICKET_TAB_KEYS);

/**
 * Where the page opens when the URL names no tab.
 *
 * `all` applies no status filter, so the list starts as the whole queue rather
 * than silently pre-filtered.
 */
export const TICKET_DEFAULT_TAB: TicketTabKey = 'all';

/** The URL's assignee shortcut: ?assignee=me or ?assignee=unassigned. */
export type AssigneeShortcut = 'me' | 'unassigned';

/**
 * Links from before the Unassigned tab was retired: the Open tab with the
 * Assignee filter on Unassigned, which lists the same rows.
 */
export const LEGACY_TABS: Record<
  string,
  { tab: TicketTabKey; assignee: AssigneeShortcut }
> = {
  unassigned: { tab: 'unclosed', assignee: 'unassigned' },
};

/** The assignee fields a shortcut stands for. */
export const assigneeForShortcut = (
  shortcut: string | null | undefined,
  currentUserId?: string,
): Pick<TicketFilters, 'assigneeId' | 'includeUnassigned'> => {
  if (shortcut === 'me' && currentUserId)
    return { assigneeId: [currentUserId], includeUnassigned: undefined };
  if (shortcut === 'unassigned')
    return { assigneeId: undefined, includeUnassigned: true };
  return {};
};

/** The shortcut these filters amount to, if any (for the URL). */
export const shortcutForFilters = (
  filters: TicketFilters,
  currentUserId?: string,
): AssigneeShortcut | null => {
  const people = filters.assigneeId ?? [];
  if (
    !filters.includeUnassigned &&
    currentUserId &&
    people.length === 1 &&
    people[0] === currentUserId
  )
    return 'me';
  if (filters.includeUnassigned && people.length === 0) return 'unassigned';
  return null;
};

/**
 * The fields a tab defines for itself. They are stripped from the incoming
 * filters and rebuilt per tab, so a previous tab's flags cannot leak into the
 * next one. Everything else, the assignee included, is carried across.
 */
type TabOwnedField = 'status' | 'customStatusIds' | 'overdueOnly';

/**
 * The filters a tab means, layered on whatever the filter bar has selected.
 * Pure, so the grid and the badge counts cannot disagree.
 */
/** The statuses a ticket can still be worked in. */
const OPEN_STATUSES = [TicketStatus.New, TicketStatus.InProgress];

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
      // Tickets in the New status: not yet picked up.
      return { ...carried, status: [TicketStatus.New] };
    case 'unclosed':
      return { ...carried, status: [...OPEN_STATUSES] };
    case 'overdue':
      return { ...carried, overdueOnly: true };
    case 'assigned-to-you':
      // A shortcut: your open tickets, set as ordinary filter values.
      return {
        ...carried,
        status: [...OPEN_STATUSES],
        ...(currentUserId
          ? { assigneeId: [currentUserId], includeUnassigned: undefined }
          : {}),
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
 * filter bar: clear New from Status on the New tab and the list is no longer
 * New. The state fields decide, plus, for "Assigned to you" only,
 * the assignee being exactly you: change or clear it and you are off that
 * tab. The current tab wins while it still matches, then the first state tab
 * that matches exactly, and All when none does. "Assigned to you" is never
 * chosen for you; it lights only when clicked.
 */
export const tabForFilters = (
  filters: TicketFilters,
  currentTab: string,
  currentUserId?: string,
): TicketTabKey => {
  const matches = (key: TicketTabKey) => {
    const definition = filtersForTab(key, filters, currentUserId);
    return (
      sameSet(definition.status, filters.status) &&
      sameSet(definition.customStatusIds, filters.customStatusIds) &&
      Boolean(definition.overdueOnly) === Boolean(filters.overdueOnly) &&
      (key !== 'assigned-to-you' ||
        shortcutForFilters(filters, currentUserId) === 'me')
    );
  };
  if (TICKET_VALID_TABS.has(currentTab) && matches(currentTab as TicketTabKey))
    return currentTab as TicketTabKey;
  const candidates: TicketTabKey[] = ['unanswered', 'unclosed', 'overdue'];
  return candidates.find(matches) ?? 'all';
};
