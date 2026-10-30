import type { TableLayoutPreference } from '@/api/local/preferences';
import {
  type TableLayout,
  useTableLayout,
} from '@/components/shared/table-layout';
import { useUserPreference } from '@/hooks/useUserPreference';
import { useCallback, useMemo } from 'react';
import {
  FROM_TENANTS_COLUMN_LABELS,
  TICKET_COLUMN_HINTS,
  TICKET_COLUMN_LABELS,
  TICKET_DEFAULT_HIDDEN,
} from '../components/ticket-grid-columns';
import type { TicketTabKey } from './ticketTabs';

/*
 * The Tickets table's layout, saved per user on the server.
 *
 * This is the ONE mechanism that decides which columns show. The old
 * width-based auto-hide (SHED_ORDER) is gone: on a narrow screen the grid now
 * scrolls sideways with the checkbox and Subject pinned, and anyone who wants
 * fewer columns hides them in the Columns chooser, once.
 */

const COLUMN_IDS = Object.keys(TICKET_COLUMN_LABELS);
/**
 * 4: widths follow the content, so a layout holds the column order, hidden
 * columns and the sort. A layout saved as 3 (no order) keeps its hidden
 * columns and sort and starts from the default order; 1 and 2 fall back to
 * the defaults.
 */
const LAYOUT_VERSION = 4;
const KEEP_HIDDEN_AND_SORT_FROM = [3];
/** Subject can move anywhere but is never hidden. */
const LOCKED = ['subject'];
const PINNED_START = ['select'];
const PINNED_END = ['actions'];

/**
 * Queues where the next deadline is the question open the list sorts by it,
 * most overdue first. All and New keep the server's default (newest).
 */
const DEADLINE_FIRST_TABS = new Set<string>([
  'unclosed',
  'overdue',
  'assigned-to-you',
]);

export const useTicketsLayout = (
  tab: TicketTabKey | string,
  { fromTenants = false }: { fromTenants?: boolean } = {},
) => {
  const pref = useUserPreference<TableLayoutPreference>('tickets.list.layout');

  const saved = pref.value;
  const value: TableLayout | null = useMemo(
    () =>
      saved
        ? {
            v: saved.v,
            order: saved.order ?? [],
            hidden: saved.hidden ?? [],
            sort: saved.sort ?? null,
          }
        : null,
    [saved],
  );

  const { save } = pref;
  const onChange = useCallback(
    (layout: TableLayout) => {
      void save(layout);
    },
    [save],
  );

  const defaultSort = useMemo(
    () =>
      DEADLINE_FIRST_TABS.has(tab) ? { id: 'deadline', desc: false } : null,
    [tab],
  );

  const layout = useTableLayout({
    version: LAYOUT_VERSION,
    keepHiddenAndSortFrom: KEEP_HIDDEN_AND_SORT_FROM,
    columnIds: COLUMN_IDS,
    defaultHidden: TICKET_DEFAULT_HIDDEN,
    defaultSort,
    lockedIds: LOCKED,
    pinnedStart: PINNED_START,
    pinnedEnd: PINNED_END,
    value,
    onChange,
  });

  return {
    layout,
    labels: fromTenants ? FROM_TENANTS_COLUMN_LABELS : TICKET_COLUMN_LABELS,
    hints: TICKET_COLUMN_HINTS,
    isReady: pref.isReady,
    hasSaved: pref.value !== null,
    reset: pref.reset,
  };
};
