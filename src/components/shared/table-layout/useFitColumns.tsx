import {
  type ColumnDef,
  type ColumnSizingState,
  type RowData,
  flexRender,
} from '@tanstack/react-table';
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

/*
 * Column widths that follow the content.
 *
 * The shared table lays out with fixed column widths, so a column narrower
 * than its text clipped it or ran it into the next column. Here every column
 * except one is as wide as its widest content on the page (header included),
 * measured from the rendered cells, and the one remaining column (a title,
 * which can be long) takes the rest of the width, never less than its
 * minimum, and truncates. When even the minimum does not fit, the table
 * scrolls sideways.
 *
 * Measured from the DOM rather than estimated, so chips, avatars, icons and
 * fonts are all counted as drawn. Cells are wrapped in a max-content box
 * (withFitMarkers), whose width is the content's natural width whatever the
 * column is currently set to. Nothing app-specific, so it can move into the
 * shared table library.
 */

const FIT_ATTR = 'data-fit-col';
/** Extra px a marked element needs beyond its own width. */
const EXTRA_ATTR = 'data-fit-extra';
const SORT_ARROW_PX = 18;

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /**
     * A fixed width in px, for a column whose values can be long and are
     * better truncated (with the full text on hover) than allowed to widen
     * the table. Not measured by useFitColumns.
     */
    fixedWidth?: number;
  }
}

export interface FitMarkerOptions {
  /** Columns sized from their definition rather than measured. */
  skipIds: string[];
  /** Sortable columns get room for the sort arrow beside the header label. */
  isSortable?: (id: string) => boolean;
}

const columnIdOf = <T extends RowData>(def: ColumnDef<T, unknown>): string =>
  def.id ?? String((def as { accessorKey?: string }).accessorKey ?? '');

/**
 * Wraps each measured column's header and cells in a max-content box that
 * useFitColumns reads. Cells are also kept on one line.
 */
export const withFitMarkers = <T extends RowData>(
  columns: ColumnDef<T, unknown>[],
  { skipIds, isSortable = () => false }: FitMarkerOptions,
): ColumnDef<T, unknown>[] =>
  columns.map(def => {
    const id = columnIdOf(def);
    // Fixed-width columns keep their own cells, so they can truncate.
    if (skipIds.includes(id) || def.meta?.fixedWidth) return def;
    const header = def.header;
    const cell = def.cell;
    return {
      ...def,
      id,
      header: ctx => (
        <span
          {...{ [FIT_ATTR]: id }}
          // Room for the sort arrow (14px plus its margin), drawn beside the
          // label by the table.
          {...(isSortable(id) ? { [EXTRA_ATTR]: SORT_ARROW_PX } : {})}
          className="inline-block whitespace-nowrap"
        >
          {typeof header === 'function' ? flexRender(header, ctx) : header}
        </span>
      ),
      cell: ctx => (
        <div {...{ [FIT_ATTR]: id }} className="w-max whitespace-nowrap">
          {cell === undefined
            ? String(ctx.getValue() ?? '')
            : flexRender(cell, ctx)}
        </div>
      ),
    } as ColumnDef<T, unknown>;
  });

export interface UseFitColumnsOptions {
  /** Holds the table; its width is the width to fill. */
  containerRef: RefObject<HTMLElement | null>;
  /** The visible columns (see fitColumnsOf). */
  columns: FitColumn[];
  /** The column that takes the remaining width and truncates. */
  fillId: string;
  /** The fill column never goes below this. */
  fillMin: number;
  /** Left and right cell padding together, in px. */
  cellPadding: number;
  /** Re-measures when any of these change (rows, names, a ticking clock). */
  deps: unknown[];
}

/** A visible column as useFitColumns sizes it. */
export interface FitColumn {
  id: string;
  /** The definition's size, kept by columns that are not measured. */
  size: number;
  /** Set from meta.fixedWidth: used as it is, never measured. */
  fixedWidth?: number;
}

/** The visible columns of `columns`, for useFitColumns. */
export const fitColumnsOf = <T extends RowData>(
  columns: ColumnDef<T, unknown>[],
  hidden: string[],
): FitColumn[] =>
  columns
    .map(def => ({
      id: columnIdOf(def),
      size: def.size ?? 150,
      fixedWidth: def.meta?.fixedWidth,
    }))
    .filter(c => !hidden.includes(c.id));

/** The shared table's scrolling box inside the container, if rendered. */
const scrollHolderOf = (el: HTMLElement): HTMLElement | null =>
  el.querySelector<HTMLElement>('[class*="group/table-scroll"]');

const sameSizing = (a: ColumnSizingState, b: ColumnSizingState) => {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length && keys.every(k => a[k] === b[k])
  );
};

/** Pass the result to useReactTable's `state.columnSizing`. */
export const useFitColumns = ({
  containerRef,
  columns,
  fillId,
  fillMin,
  cellPadding,
  deps,
}: UseFitColumnsOptions): ColumnSizingState => {
  const [sizing, setSizing] = useState<ColumnSizingState>({});
  const columnsKey = columns
    .map(c => `${c.id}:${c.size}:${c.fixedWidth ?? ''}`)
    .join(',');

  // Late web fonts change every width once they arrive.
  const [fontsReady, setFontsReady] = useState(false);
  useLayoutEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => live && setFontsReady(true));
    return () => {
      live = false;
    };
  }, []);

  /*
   * Measures the rendered cells and sets the widths. Reads the latest options
   * through a ref, so the content observer below always uses current ones.
   */
  const latest = useRef({ columns, fillId, fillMin, cellPadding });
  latest.current = { columns, fillId, fillMin, cellPadding };
  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const opts = latest.current;
    const widest = new Map<string, number>();
    for (const node of Array.from(
      el.querySelectorAll<HTMLElement>(`[${FIT_ATTR}]`),
    )) {
      const id = node.getAttribute(FIT_ATTR) ?? '';
      const w =
        Math.ceil(node.getBoundingClientRect().width) +
        Number(node.getAttribute(EXTRA_ATTR) ?? 0);
      if (w > (widest.get(id) ?? 0)) widest.set(id, w);
    }

    const next: ColumnSizingState = {};
    let used = 0;
    for (const { id, size, fixedWidth } of opts.columns) {
      if (id === opts.fillId) continue;
      // Measured columns: content plus padding and the 1px divider. Others
      // (checkbox, row menu) keep their own size.
      const measured = widest.get(id);
      const w =
        fixedWidth ??
        (measured !== undefined ? measured + opts.cellPadding + 1 : size);
      next[id] = w;
      used += w;
    }
    if (opts.columns.some(c => c.id === opts.fillId)) {
      /*
       * The width on offer is the scroll holder's clientWidth, measured:
       * inside its border and beside its vertical scrollbar, whose width
       * depends on the platform and on whether the rows overflow at all.
       * 2px spare for the column dividers' rounding.
       */
      const holder = scrollHolderOf(el);
      const available = holder ? holder.clientWidth : el.clientWidth - 2;
      next[opts.fillId] = Math.max(
        opts.fillMin,
        Math.floor(available - used - 2),
      );
    }
    setSizing(prev => (sameSizing(prev, next) ? prev : next));
  }, [containerRef]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: deps is the caller's list of what changes the content
  useLayoutEffect(measure, [
    measure,
    columnsKey,
    fillId,
    fillMin,
    cellPadding,
    fontsReady,
    ...deps,
  ]);

  /*
   * Content that arrives after the rows render (names resolved, a company
   * looked up, a chip's label ticking over) changes text without changing
   * any of the above, so the cells are watched too, once per frame at most.
   * Only text and nodes are watched, not attributes, so setting the widths
   * does not trigger another measurement.
   */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    // The width on offer changes with the window, and with the scroll
    // holder's vertical scrollbar coming and going.
    const resize = new ResizeObserver(schedule);
    resize.observe(el);
    const holder = scrollHolderOf(el);
    if (holder) resize.observe(holder);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
    };
  }, [containerRef, measure]);

  return sizing;
};
