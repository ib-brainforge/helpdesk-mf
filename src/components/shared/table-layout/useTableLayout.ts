import type {
  ColumnOrderState,
  ColumnSizingState,
  OnChangeFn,
  SortingState,
  Updater,
  VisibilityState,
} from '@tanstack/react-table';
import { useCallback, useMemo } from 'react';

/*
 * A table's saved layout as TanStack state: column order, visibility, widths
 * and sort.
 *
 * Written against plain TanStack types with persistence passed in, so it can
 * move into the shared table library unchanged. The caller decides where the
 * layout is stored (Helpdesk keeps it in the per-user preferences store).
 */

export interface TableLayout {
  /** Column ids in display order. */
  order: string[];
  /** Hidden column ids. Stored this way so a column added later shows by default. */
  hidden: string[];
  /** Widths in px, by column id. */
  widths: Record<string, number>;
  sort: { id: string; desc: boolean } | null;
}

export interface UseTableLayoutOptions {
  /** Every column id, in the default order. */
  columnIds: string[];
  /** Hidden until the user shows them. */
  defaultHidden?: string[];
  /** Applied while the user has not chosen a sort. */
  defaultSort?: { id: string; desc: boolean } | null;
  /** Always shown, never hidden (e.g. the title column). */
  lockedIds?: string[];
  /**
   * Fixed at the start or end, never listed in a chooser, never hidden or
   * moved (selection checkbox, row actions).
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
  columnIds,
  defaultHidden = [],
  defaultSort = null,
  lockedIds = [],
  pinnedStart = [],
  pinnedEnd = [],
  value,
  onChange,
}: UseTableLayoutOptions) => {
  const fixed = useMemo(
    () => new Set([...pinnedStart, ...pinnedEnd]),
    [pinnedStart, pinnedEnd],
  );
  const movable = useMemo(
    () => columnIds.filter(id => !fixed.has(id)),
    [columnIds, fixed],
  );

  /*
   * The saved order, with ids that no longer exist dropped and new ones put
   * back at their default position relative to their default neighbours.
   */
  const order = useMemo(() => {
    const saved = (value?.order ?? []).filter(id => movable.includes(id));
    const result = [...saved];
    movable.forEach((id, index) => {
      if (result.includes(id)) return;
      const before = movable
        .slice(0, index)
        .reverse()
        .find(b => result.includes(b));
      result.splice(before ? result.indexOf(before) + 1 : 0, 0, id);
    });
    return result;
  }, [value?.order, movable]);

  const hidden = useMemo(() => {
    const ids = value ? value.hidden : defaultHidden;
    return ids.filter(id => movable.includes(id) && !lockedIds.includes(id));
  }, [value, defaultHidden, movable, lockedIds]);

  const layout: TableLayout = useMemo(
    () => ({
      order,
      hidden,
      widths: value?.widths ?? {},
      sort: value?.sort ?? null,
    }),
    [order, hidden, value?.widths, value?.sort],
  );

  const columnOrder: ColumnOrderState = useMemo(
    () => [...pinnedStart, ...order, ...pinnedEnd],
    [pinnedStart, order, pinnedEnd],
  );
  const columnVisibility: VisibilityState = useMemo(
    () => Object.fromEntries(hidden.map(id => [id, false])),
    [hidden],
  );
  const columnSizing: ColumnSizingState = layout.widths;
  const sortSource = layout.sort ?? defaultSort;
  const sorting: SortingState = useMemo(
    () => (sortSource ? [{ id: sortSource.id, desc: sortSource.desc }] : []),
    [sortSource],
  );

  const update = useCallback(
    (patch: Partial<TableLayout>) => onChange({ ...layout, ...patch }),
    [layout, onChange],
  );

  const onColumnOrderChange: OnChangeFn<ColumnOrderState> = useCallback(
    updater => {
      const next = resolve(updater, columnOrder).filter(id =>
        movable.includes(id),
      );
      if (!sameIds(next, order)) update({ order: next });
    },
    [columnOrder, movable, order, update],
  );

  const onColumnVisibilityChange: OnChangeFn<VisibilityState> = useCallback(
    updater => {
      const next = resolve(updater, columnVisibility);
      const nextHidden = movable.filter(
        id => next[id] === false && !lockedIds.includes(id),
      );
      if (!sameIds(nextHidden, hidden)) update({ hidden: nextHidden });
    },
    [columnVisibility, movable, lockedIds, hidden, update],
  );

  const onColumnSizingChange: OnChangeFn<ColumnSizingState> = useCallback(
    updater => {
      const next = resolve(updater, columnSizing);
      const widths = Object.fromEntries(
        Object.entries(next).map(([id, px]) => [id, Math.round(px)]),
      );
      update({ widths });
    },
    [columnSizing, update],
  );

  const onSortingChange: OnChangeFn<SortingState> = useCallback(
    updater => {
      const [first] = resolve(updater, sorting);
      update({ sort: first ? { id: first.id, desc: first.desc } : null });
    },
    [sorting, update],
  );

  /** Moves one column up (-1) or down (+1) among the movable columns. */
  const move = useCallback(
    (id: string, toIndex: number) => {
      const from = order.indexOf(id);
      if (
        from < 0 ||
        toIndex < 0 ||
        toIndex >= order.length ||
        from === toIndex ||
        // A locked column keeps its place; nothing moves past it.
        lockedIds.includes(id) ||
        lockedIds.includes(order[toIndex])
      ) {
        return;
      }
      const next = [...order];
      next.splice(from, 1);
      next.splice(toIndex, 0, id);
      update({ order: next });
    },
    [order, lockedIds, update],
  );

  const setHidden = useCallback(
    (id: string, isHidden: boolean) => {
      if (lockedIds.includes(id)) return;
      const next = isHidden
        ? [...hidden.filter(h => h !== id), id]
        : hidden.filter(h => h !== id);
      update({ hidden: movable.filter(m => next.includes(m)) });
    },
    [hidden, lockedIds, movable, update],
  );

  return {
    /** Pass to useReactTable's `state`. */
    state: { columnOrder, columnVisibility, columnSizing, sorting },
    onColumnOrderChange,
    onColumnVisibilityChange,
    onColumnSizingChange,
    onSortingChange,
    /** The chooser's view: movable ids in order, and which are hidden. */
    order,
    hidden,
    lockedIds,
    move,
    setHidden,
  };
};

export type TableLayoutController = ReturnType<typeof useTableLayout>;
