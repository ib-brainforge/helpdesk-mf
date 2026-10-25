import type { TicketFilters } from '@/types/ticket';
import { type TicketTabKey, filtersForTab } from './ticketTabs';

/*
 * The tickets list in the address bar.
 *
 * Every filter, the sort, the page size and the page are written to the query
 * string and read back on load, so a copied link reopens the same list. Lists
 * are comma separated. ?tab=, ?assignee=me|unassigned, ?tenant= and
 * ?organisation= keep the meaning older links gave them (a single id is a
 * list of one). Nothing is written for a default: page 1, 25 rows, and the
 * statuses a tab sets by itself, so Clear filters leaves a clean URL.
 */

/** Every key this list owns, so a write never touches anyone else's (?new=). */
const KEYS = [
  'q',
  'assignee',
  'status',
  'cstatus',
  'priority',
  'tenant',
  'organisation',
  'category',
  'tag',
  'division',
  'overdue',
  'sort',
  'dir',
  'page',
  'size',
] as const;

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZES = new Set([10, 25, 50, 100]);

const list = (value: string | null) => {
  const items = (value ?? '').split(',').filter(Boolean);
  return items.length > 0 ? items : undefined;
};

/**
 * The filters the URL names, only those it names. `assignee` takes ids plus
 * the tokens `me` (whoever opens the link) and `unassigned`.
 */
export const filtersFromUrl = (
  params: URLSearchParams,
  currentUserId?: string,
  legacyAssignee?: string,
): TicketFilters => {
  const out: TicketFilters = {};
  const assignee = list(legacyAssignee ?? params.get('assignee'));
  if (assignee) {
    const people = assignee
      .map(token => (token === 'me' ? currentUserId : token))
      .filter((id): id is string => Boolean(id) && id !== 'unassigned');
    if (people.length > 0) out.assigneeId = people;
    if (assignee.includes('unassigned')) out.includeUnassigned = true;
  }
  const q = params.get('q');
  if (q) out.searchTerm = q;
  const set = <K extends keyof TicketFilters>(
    key: K,
    value: TicketFilters[K],
  ) => {
    if (value !== undefined) out[key] = value;
  };
  set('status', list(params.get('status')));
  set('customStatusIds', list(params.get('cstatus')));
  set('priority', list(params.get('priority')));
  set('tenantId', list(params.get('tenant')));
  set('organisationId', list(params.get('organisation')));
  set('categoryId', list(params.get('category')));
  set('tagIds', list(params.get('tag')));
  set('divisionId', params.get('division') || undefined);
  if (params.get('overdue') === '1') out.overdueOnly = true;
  return out;
};

/**
 * The first filters for a tab and a URL: the tab's own definition, then
 * whatever the URL sets on top (a status the user changed stays changed).
 */
export const initialFiltersFromUrl = (
  tab: string,
  params: URLSearchParams,
  currentUserId?: string,
  legacyAssignee?: string,
): TicketFilters => {
  const fromUrl = filtersFromUrl(params, currentUserId, legacyAssignee);
  const seeded = filtersForTab(tab, fromUrl, currentUserId);
  return {
    ...seeded,
    ...(fromUrl.status ? { status: fromUrl.status } : {}),
    ...(fromUrl.customStatusIds
      ? { customStatusIds: fromUrl.customStatusIds }
      : {}),
    ...(fromUrl.overdueOnly ? { overdueOnly: true } : {}),
  };
};

export interface ListSort {
  id: string;
  desc: boolean;
}

/** The sort the URL names, if any (column id and direction). */
export const sortFromUrl = (
  params: URLSearchParams,
  isSortable: (id: string) => boolean,
): ListSort | null => {
  const id = params.get('sort');
  if (!id || !isSortable(id)) return null;
  return { id, desc: params.get('dir') === 'desc' };
};

/** The page and page size the URL names, defaults otherwise. */
export const paginationFromUrl = (params: URLSearchParams) => {
  const size = Number(params.get('size'));
  const page = Number(params.get('page'));
  return {
    pageIndex: Number.isInteger(page) && page > 1 ? page - 1 : 0,
    pageSize: PAGE_SIZES.has(size) ? size : DEFAULT_PAGE_SIZE,
  };
};

const sameSet = (a?: readonly string[], b?: readonly string[]) => {
  const x = [...(a ?? [])].sort();
  const y = [...(b ?? [])].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

const encodeAssignee = (filters: TicketFilters, currentUserId?: string) => {
  const people = filters.assigneeId ?? [];
  const tokens = people.map(id =>
    // Exactly you stays `me`, as older links wrote it.
    people.length === 1 && id === currentUserId && !filters.includeUnassigned
      ? 'me'
      : id,
  );
  if (filters.includeUnassigned) tokens.push('unassigned');
  return tokens.join(',');
};

/**
 * Writes the list's state into `params` (in place, for setSearchParams),
 * removing every key of ours that is now at its default.
 */
export const writeListToUrl = (
  params: URLSearchParams,
  state: {
    tab: TicketTabKey | string;
    filters: TicketFilters;
    sort: ListSort | null;
    pagination: { pageIndex: number; pageSize: number };
    currentUserId?: string;
  },
) => {
  const { tab, filters, sort, pagination, currentUserId } = state;
  for (const key of KEYS) params.delete(key);
  const put = (key: (typeof KEYS)[number], value?: string | string[]) => {
    const text = Array.isArray(value) ? value.join(',') : value;
    if (text) params.set(key, text);
  };
  put('q', filters.searchTerm?.trim());
  // "Assigned to you" sets the assignee itself.
  if (tab !== 'assigned-to-you')
    put('assignee', encodeAssignee(filters, currentUserId));
  // The statuses and Overdue a tab sets are the tab's; only a change is ours.
  const own = filtersForTab(tab, filters, currentUserId);
  if (
    !sameSet(own.status, filters.status) ||
    !sameSet(own.customStatusIds, filters.customStatusIds) ||
    Boolean(own.overdueOnly) !== Boolean(filters.overdueOnly)
  ) {
    put('status', filters.status);
    put('cstatus', filters.customStatusIds);
    if (filters.overdueOnly) put('overdue', '1');
  }
  put('priority', filters.priority);
  put('tenant', filters.tenantId);
  put('organisation', filters.organisationId);
  put('category', filters.categoryId);
  put('tag', filters.tagIds);
  put('division', filters.divisionId);
  if (sort) {
    put('sort', sort.id);
    put('dir', sort.desc ? 'desc' : 'asc');
  }
  if (pagination.pageIndex > 0) put('page', String(pagination.pageIndex + 1));
  if (pagination.pageSize !== DEFAULT_PAGE_SIZE)
    put('size', String(pagination.pageSize));
  return params;
};

/**
 * The Overdue tab of the Tickets list for one tenant, or one of its
 * organisations: where every "N late" count links to.
 */
export const overdueTicketsHref = (
  tenantId: string,
  organisationId?: string | null,
): string => {
  const params = new URLSearchParams({ tab: 'overdue', tenant: tenantId });
  if (organisationId) params.set('organisation', organisationId);
  return `/tickets?${params}`;
};
