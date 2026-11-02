import type { TicketFilters } from '@/types/ticket';
import { TicketStatus } from '@/types/ticket';
import {
  type FilterValues,
  boolParam,
  idParam,
  listParam,
  textParam,
} from '@brainforgeau/components/page';

/**
 * The ticket list's filters, as URL codecs (so Clear, the URL and saved views
 * all see them), and what each tab means in terms of them.
 *
 * Tabs answer "in what state". They are shortcuts, not a state of their own:
 * choosing one writes its status / overdue values into the filters, and the
 * highlighted tab is read back from the filters. Change a status in the filter
 * bar and the tab follows. "Whose" belongs to the Assignee filter, which every
 * tab keeps; "Assigned to you" is the one tab that also sets it (to `me`).
 *
 * `assignee` holds tokens: a user id, `me` (whoever opens the link) or
 * `unassigned`.
 */
export const TICKET_FILTER_CODECS = {
  assignee: listParam(textParam()),
  status: listParam(textParam()),
  cstatus: listParam(textParam()),
  priority: listParam(textParam()),
  category: listParam(textParam()),
  tag: listParam(textParam()),
  overdue: boolParam(),
  /** The "Raised with our provider" preset of the one list. */
  raised: boolParam(),
  division: idParam(),
};

export type TicketListFilterValues = FilterValues<typeof TICKET_FILTER_CODECS>;

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

/** The statuses a ticket can still be worked in. */
const OPEN_STATUSES = [TicketStatus.New, TicketStatus.InProgress];

/** The assignee token that stands for the signed-in user. */
export const ME = 'me';
export const UNASSIGNED_TOKEN = 'unassigned';

/** The fields a tab defines for itself; the rest of the filters carry across tabs. */
const tabBase = () => ({
  status: [] as string[],
  cstatus: [] as string[],
  overdue: false,
});

/**
 * The filter values a tab sets. Applied on top of the current filters, so the
 * assignee, priority and the rest survive a tab change ("Assigned to you" then
 * Overdue is your overdue tickets, with you still shown in Assignee).
 */
export const tabFilterPatch = (
  tab: TicketTabKey,
): Partial<TicketListFilterValues> => {
  switch (tab) {
    case 'unanswered':
      return { ...tabBase(), status: [TicketStatus.New] };
    case 'unclosed':
      return { ...tabBase(), status: [...OPEN_STATUSES] };
    case 'overdue':
      return { ...tabBase(), overdue: true };
    case 'assigned-to-you':
      return { ...tabBase(), status: [...OPEN_STATUSES], assignee: [ME] };
    default:
      return { ...tabBase() };
  }
};

/**
 * Queues where the next deadline is the question open the list sorted by it,
 * most overdue first. All and New keep the server's default (newest).
 */
const DEADLINE_FIRST_TABS = new Set<TicketTabKey>([
  'unclosed',
  'overdue',
  'assigned-to-you',
]);

export const defaultSortForTab = (tab: TicketTabKey) =>
  DEADLINE_FIRST_TABS.has(tab) ? [{ id: 'deadline', desc: false }] : [];

const sameSet = (a: readonly string[], b: readonly string[]) => {
  const x = [...a].sort();
  const y = [...b].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

/** True when `token` stands for the signed-in user (`me`, or their id). */
export const isMeToken = (token: string, currentUserId?: string) =>
  token === ME || (!!currentUserId && token === currentUserId);

/**
 * The tab that describes these filters, so the highlighted tab follows the
 * filter bar: clear New from Status on the New tab and the list is no longer
 * New. The state fields decide (status, custom statuses, overdue), plus, for
 * "Assigned to you" only, the assignee being exactly you. All when none match.
 */
export const tabForFilters = (
  values: TicketListFilterValues,
  currentUserId?: string,
): TicketTabKey => {
  const matches = (tab: TicketTabKey) => {
    const patch = { ...tabBase(), ...tabFilterPatch(tab) };
    return (
      sameSet(patch.status, values.status) &&
      sameSet([], values.cstatus) &&
      Boolean(patch.overdue) === values.overdue
    );
  };
  const justMe =
    values.assignee.length === 1 &&
    isMeToken(values.assignee[0], currentUserId);
  if (justMe && matches('assigned-to-you')) return 'assigned-to-you';
  const candidates: TicketTabKey[] = ['unanswered', 'unclosed', 'overdue'];
  return candidates.find(matches) ?? 'all';
};

/** The filters the ticket endpoints take, from the codec values and the search text. */
export const toTicketFilters = (
  values: TicketListFilterValues,
  searchTerm: string,
  currentUserId?: string,
): TicketFilters => {
  const people = values.assignee
    .filter(token => token !== UNASSIGNED_TOKEN)
    .map(token => (token === ME ? currentUserId : token))
    .filter((p): p is string => Boolean(p));
  const filled = <T>(items: T[]) => (items.length > 0 ? items : undefined);
  return {
    searchTerm: searchTerm.trim() || undefined,
    assigneeId: filled(people),
    includeUnassigned: values.assignee.includes(UNASSIGNED_TOKEN)
      ? true
      : undefined,
    status: filled(values.status),
    customStatusIds: filled(values.cstatus),
    priority: filled(values.priority),
    categoryId: filled(values.category),
    tagIds: filled(values.tag),
    divisionId: values.division || undefined,
    overdueOnly: values.overdue ? true : undefined,
    raisedAboveOnly: values.raised ? true : undefined,
  };
};
