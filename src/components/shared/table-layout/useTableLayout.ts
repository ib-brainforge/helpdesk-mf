import type {
  OnChangeFn,
  SortingState,
  Updater,
  VisibilityState,
} from '@tanstack/react-table';
import { useCallback, useMemo } from 'react';

/*
 * A table's saved layout as TanStack state: which columns are hidden, and the
 * sort.
 *
 * Column order is fixed by the column definitions and widths follow the
 * content (useFitColumns), so neither is a user setting and neither is
 * stored.
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
  /** Hidden column ids. Stored this way so a column added later shows by default. */
  hidden: string[];
  sort: { id: string; desc: boolean } | null;
}

export interface UseTableLayoutOptions {
  /** Bump when the columns or their defaults change (see TableLayout.v). */
  version: number;
  /** Every column id, in display order. */
  columnIds: string[];
  /** Hidden until the user shows them. */
  defaultHidden?: string[];
  /** Applied while the user has not chosen a sort. */
  defaultSort?: { id: string; desc: boolean } | null;
  /** Always shown, never hidden (e.g. the title column). */
  lockedIds?: string[];
  /**
   * Structural columns, never listed in a chooser and never hidden
   * (selection checkbox, row actions).
   */
  fixedIds?: string[];
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
  columnIds,
  defaultHidden = [],
  defaultSort = null,
  lockedIds = [],
  fixedIds = [],
  value: savedValue,
  onChange,
}: UseTableLayoutOptions) => {
  const value = savedValue?.v === version ? savedValue : null;

  /** The columns a chooser lists, in display order. */
  const columns = useMemo(
    () => columnIds.filter(id => !fixedIds.includes(id)),
    [columnIds, fixedIds],
  );

  const hidden = useMemo(() => {
    const ids = value ? value.hidden : defaultHidden;
    return columns.filter(id => ids.includes(id) && !lockedIds.includes(id));
  }, [value, defaultHidden, columns, lockedIds]);

  const layout: TableLayout = useMemo(
    () => ({ v: version, hidden, sort: value?.sort ?? null }),
    [version, hidden, value?.sort],
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
      const nextHidden = columns.filter(
        id => next[id] === false && !lockedIds.includes(id),
      );
      if (!sameIds(nextHidden, hidden)) update({ hidden: nextHidden });
    },
    [columnVisibility, columns, lockedIds, hidden, update],
  );

  const onSortingChange: OnChangeFn<SortingState> = useCallback(
    updater => {
      const [first] = resolve(updater, sorting);
      update({ sort: first ? { id: first.id, desc: first.desc } : null });
    },
    [sorting, update],
  );

  const setHidden = useCallback(
    (id: string, isHidden: boolean) => {
      if (lockedIds.includes(id)) return;
      const next = isHidden
        ? [...hidden.filter(h => h !== id), id]
        : hidden.filter(h => h !== id);
      update({ hidden: columns.filter(c => next.includes(c)) });
    },
    [hidden, lockedIds, columns, update],
  );

  return {
    /** Pass to useReactTable's `state`. */
    state: { columnVisibility, sorting },
    onColumnVisibilityChange,
    onSortingChange,
    /** The chooser's view: listed ids in display order, and which are hidden. */
    columns,
    hidden,
    lockedIds,
    setHidden,
  };
};

export type TableLayoutController = ReturnType<typeof useTableLayout>;
