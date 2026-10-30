import type {
  ColumnOrderState,
  OnChangeFn,
  SortingState,
  Updater,
  VisibilityState,
} from '@tanstack/react-table';
import { useCallback, useMemo } from 'react';

/*
 * A table's saved layout as TanStack state: column order, which columns are
 * hidden, and the sort.
 *
 * Widths are not a user setting: they follow the content (useFitColumns).
 *
 * Written against plain TanStack types with persistence passed in, so it can
 * move into the shared table library unchanged. The caller decides where the
 * layout is stored (Helpdesk keeps it in the per-user preferences store).
 */

export interface TableLayout {
  /**
   * Layout version. A saved layout of another version is ignored and the
   * defaults apply, so changing the default columns never resurrects old
   * ones from a layout saved before the change.
   */
  v: number;
  /** Column ids in display order. */
  order: string[];
  /** Hidden column ids. Stored this way so a column added later shows by default. */
  hidden: string[];
  sort: { id: string; desc: boolean } | null;
}

export interface UseTableLayoutOptions {
  /** Bump when the columns or their defaults change (see TableLayout.v). */
  version: number;
  /**
   * Older versions whose hidden columns and sort still apply. Their column
   * order does not: it starts from the default.
   */
  keepHiddenAndSortFrom?: number[];
  /** Every column id, in the default order. */
  columnIds: string[];
  /** Hidden until the user shows them. */
  defaultHidden?: string[];
  /** Applied while the user has not chosen a sort. */
  defaultSort?: { id: string; desc: boolean } | null;
  /** Always shown, never hidden (e.g. the title column). They still move. */
  lockedIds?: string[];
  /**
   * Structural columns fixed at the start or end: never listed in a chooser,
   * never hidden or moved (selection checkbox, row actions).
   */
  pinnedStart?: string[];
  pinnedEnd?: string[];
  /** The saved layout, or null for the defaults. */
  value: TableLayout | null;
  onChange: (layout: TableLayout) => void;
}

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

const resolve = <T>(updater: Updater<T>, prev: T): T =>
  typeof updater === 'function' ? (updater as (old: T) => T)(prev) : updater;

export const useTableLayout = ({
  version,
  keepHiddenAndSortFrom = [],
  columnIds,
  defaultHidden = [],
  defaultSort = null,
  lockedIds = [],
  pinnedStart = [],
  pinnedEnd = [],
  value: savedValue,
  onChange,
}: UseTableLayoutOptions) => {
  const isCurrent = savedValue?.v === version;
  const value =
    savedValue && (isCurrent || keepHiddenAndSortFrom.includes(savedValue.v))
      ? savedValue
      : null;

  /** The columns a chooser lists and moves, in the default order. */
  const movable = useMemo(
    () =>
      columnIds.filter(
        id => !pinnedStart.includes(id) && !pinnedEnd.includes(id),
      ),
    [columnIds, pinnedStart, pinnedEnd],
  );

  /*
   * The saved order, with ids that no longer exist dropped and new ones put
   * back at their default position relative to their default neighbours.
   * An older layout kept for its hidden columns and sort has no order of
   * its own here.
   */
  const savedOrder = isCurrent ? savedValue?.order : undefined;
  const order = useMemo(() => {
    const result = (savedOrder ?? []).filter(id => movable.includes(id));
    movable.forEach((id, index) => {
      if (result.includes(id)) return;
      const before = movable
        .slice(0, index)
        .reverse()
        .find(b => result.includes(b));
      result.splice(before ? result.indexOf(before) + 1 : 0, 0, id);
    });
    return result;
  }, [savedOrder, movable]);

  const hidden = useMemo(() => {
    const ids = value ? (value.hidden ?? []) : defaultHidden;
    return order.filter(id => ids.includes(id) && !lockedIds.includes(id));
  }, [value, defaultHidden, order, lockedIds]);

  const layout: TableLayout = useMemo(
    () => ({ v: version, order, hidden, sort: value?.sort ?? null }),
    [version, order, hidden, value?.sort],
  );

  const columnOrder: ColumnOrderState = useMemo(
    () => [...pinnedStart, ...order, ...pinnedEnd],
    [pinnedStart, order, pinnedEnd],
  );
  const columnVisibility: VisibilityState = useMemo(
    () => Object.fromEntries(hidden.map(id => [id, false])),
    [hidden],
  );
  const sortSource = layout.sort ?? defaultSort;
  const sorting: SortingState = useMemo(
    () => (sortSource ? [{ id: sortSource.id, desc: sortSource.desc }] : []),
    [sortSource],
  );

  const update = useCallback(
    (patch: Partial<TableLayout>) => onChange({ ...layout, ...patch }),
    [layout, onChange],
  );

  const onColumnVisibilityChange: OnChangeFn<VisibilityState> = useCallback(
    updater => {
      const next = resolve(updater, columnVisibility);
      const nextHidden = order.filter(
        id => next[id] === false && !lockedIds.includes(id),
      );
      if (!sameIds(nextHidden, hidden)) update({ hidden: nextHidden });
    },
    [columnVisibility, order, lockedIds, hidden, update],
  );

  const onSortingChange: OnChangeFn<SortingState> = useCallback(
    updater => {
      const [first] = resolve(updater, sorting);
      update({ sort: first ? { id: first.id, desc: first.desc } : null });
    },
    [sorting, update],
  );

  /** Moves one column to `toIndex` among the movable columns. */
  const move = useCallback(
    (id: string, toIndex: number) => {
      const from = order.indexOf(id);
      if (
        from < 0 ||
        toIndex < 0 ||
        toIndex >= order.length ||
        from === toIndex
      )
        return;
      const next = [...order];
      next.splice(from, 1);
      next.splice(toIndex, 0, id);
      update({ order: next });
    },
    [order, update],
  );

  const setHidden = useCallback(
    (id: string, isHidden: boolean) => {
      if (lockedIds.includes(id)) return;
      const next = isHidden
        ? [...hidden.filter(h => h !== id), id]
        : hidden.filter(h => h !== id);
      update({ hidden: order.filter(c => next.includes(c)) });
    },
    [hidden, lockedIds, order, update],
  );

  return {
    /** Pass to useReactTable's `state`. */
    state: { columnOrder, columnVisibility, sorting },
    onColumnVisibilityChange,
    onSortingChange,
    /** The chooser's view: movable ids in display order, and which are hidden. */
    order,
    hidden,
    lockedIds,
    move,
    setHidden,
  };
};

export type TableLayoutController = ReturnType<typeof useTableLayout>;
