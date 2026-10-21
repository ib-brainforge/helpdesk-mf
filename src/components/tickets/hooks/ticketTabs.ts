import { type TicketFilters, TicketStatus } from '@/types/ticket';

/**
 * What each ticket tab means, in one place.
 *
 * Tabs answer "in what state" and nothing else. "Whose" belongs to the
 * Assignee filter (and its "Mine" shortcut), which survives every tab change
 * and narrows every badge. Two tabs used to be assignee selections in a tab's
 * clothes ("Assigned to you", "Unassigned"), so clicking Overdue from your own
 * queue dropped you from the filter, and a page of code existed only to keep
 * the two models in step.
 *
 * The grid and the badge counts both use `filtersForTab`, so a badge is always
 * a statement about the list it labels.
 */

/** Tab keys. The set below and this union must stay in step. */
export type TicketTabKey = 'unanswered' | 'unclosed' | 'overdue' | 'all';

export const TICKET_TAB_KEYS: readonly TicketTabKey[] = [
  'unanswered',
  'unclosed',
  'overdue',
  'all',
];

/** What each tab is called in the tab row (and its More menu). */
export const TICKET_TAB_LABELS: Record<TicketTabKey, string> = {
  unanswered: 'Unanswered',
  unclosed: 'Unclosed',
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
 * Links from before the tabs were simplified. Each old person tab becomes the
 * Unclosed tab with the matching assignee shortcut, which lists the same rows.
 */
export const LEGACY_TABS: Record<
  string,
  { tab: TicketTabKey; assignee: AssigneeShortcut }
> = {
  'assigned-to-you': { tab: 'unclosed', assignee: 'me' },
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

/** Whether the Assignee filter is exactly the signed-in user. */
export const isMine = (filters: TicketFilters, currentUserId?: string) =>
  shortcutForFilters(filters, currentUserId) === 'me';

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
export const filtersForTab = (
  tabKey: string,
  filters: TicketFilters,
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
    case 'overdue':
      return { ...carried, overdueOnly: true };
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
 * filter bar: clear New from Status on Unanswered and the list is no longer
 * Unanswered. Only the state fields decide; the assignee never moves the tab.
 * The current tab wins while it still matches, then the first tab that
 * matches exactly, and All when none does.
 */
export const tabForFilters = (
  filters: TicketFilters,
  currentTab: string,
): TicketTabKey => {
  const matches = (key: TicketTabKey) => {
    const definition = filtersForTab(key, filters);
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
