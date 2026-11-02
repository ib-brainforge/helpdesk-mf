import { describe, expect, it } from 'vitest';
import {
  TICKET_FILTER_CODECS,
  type TicketListFilterValues,
  defaultSortForTab,
  tabFilterPatch,
  tabForFilters,
  toTicketFilters,
} from './ticketTabs';

const none = (): TicketListFilterValues => ({
  assignee: [],
  status: [],
  cstatus: [],
  priority: [],
  category: [],
  tag: [],
  overdue: false,
  raised: false,
  division: '',
});
const withPatch = (tab: Parameters<typeof tabFilterPatch>[0]) => ({
  ...none(),
  ...tabFilterPatch(tab),
});

describe('ticket tabs as filter shortcuts', () => {
  it('reads each tab back from the filters it wrote', () => {
    for (const tab of ['unanswered', 'unclosed', 'overdue', 'all'] as const) {
      expect(tabForFilters(withPatch(tab))).toBe(tab);
    }
    expect(tabForFilters(withPatch('assigned-to-you'), 'user-1')).toBe(
      'assigned-to-you',
    );
  });

  it('leaves Assigned to you when the assignee is no longer exactly you', () => {
    const values = withPatch('assigned-to-you');
    expect(
      tabForFilters({ ...values, assignee: ['me', 'someone'] }, 'user-1'),
    ).toBe('unclosed');
    expect(tabForFilters({ ...values, assignee: [] }, 'user-1')).toBe(
      'unclosed',
    );
  });

  it('follows the status filter: clearing New off the New tab is All', () => {
    expect(tabForFilters({ ...withPatch('unanswered'), status: [] })).toBe(
      'all',
    );
  });

  it('keeps the other filters when a tab is chosen', () => {
    const patch = tabFilterPatch('overdue');
    expect(patch).not.toHaveProperty('assignee');
    expect(patch).not.toHaveProperty('priority');
  });

  it('sorts the queue tabs by deadline and the others by the server default', () => {
    expect(defaultSortForTab('overdue')).toEqual([
      { id: 'deadline', desc: false },
    ]);
    expect(defaultSortForTab('all')).toEqual([]);
  });
});

describe('toTicketFilters', () => {
  it('turns me into the signed-in user and unassigned into the flag', () => {
    const filters = toTicketFilters(
      { ...none(), assignee: ['me', 'unassigned', 'other'] },
      ' vpn ',
      'user-1',
    );
    expect(filters.assigneeId).toEqual(['user-1', 'other']);
    expect(filters.includeUnassigned).toBe(true);
    expect(filters.searchTerm).toBe('vpn');
  });

  it('sends nothing for empty filters', () => {
    expect(toTicketFilters(none(), '', 'user-1')).toEqual({
      searchTerm: undefined,
      assigneeId: undefined,
      includeUnassigned: undefined,
      status: undefined,
      customStatusIds: undefined,
      priority: undefined,
      categoryId: undefined,
      tagIds: undefined,
      divisionId: undefined,
      overdueOnly: undefined,
      raisedAboveOnly: undefined,
    });
  });
});

describe('the filters in the URL', () => {
  it('reads the keys older links used: raised=1, comma lists', () => {
    expect(TICKET_FILTER_CODECS.raised.parse('1')).toBe(true);
    expect(TICKET_FILTER_CODECS.assignee.parse('me,unassigned')).toEqual([
      'me',
      'unassigned',
    ]);
    expect(TICKET_FILTER_CODECS.status.parse('New,InProgress')).toEqual([
      'New',
      'InProgress',
    ]);
  });
});
