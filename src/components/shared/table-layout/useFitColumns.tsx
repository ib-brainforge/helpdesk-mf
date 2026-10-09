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
    if (skipIds.includes(id)) return def;
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
  /** Visible column ids, with the size each has in its definition. */
  columns: Array<{ id: string; size: number }>;
  /** The column that takes the remaining width and truncates. */
  fillId: string;
  /** The fill column never goes below this. */
  fillMin: number;
  /** Left and right cell padding together, in px. */
  cellPadding: number;
  /** Re-measures when any of these change (rows, names, a ticking clock). */
  deps: unknown[];
}

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
  const [width, setWidth] = useState(0);
  const columnsKey = columns.map(c => `${c.id}:${c.size}`).join(',');

  // The width to fill, kept current as the window or the page changes.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const read = () => setWidth(el.clientWidth);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

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
  const latest = useRef({ columns, fillId, fillMin, cellPadding, width });
  latest.current = { columns, fillId, fillMin, cellPadding, width };
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
    for (const { id, size } of opts.columns) {
      if (id === opts.fillId) continue;
      // Measured columns: content plus padding and the 1px divider. Others
      // (checkbox, row menu) keep their own size.
      const measured = widest.get(id);
      const w = measured !== undefined ? measured + opts.cellPadding + 1 : size;
      next[id] = w;
      used += w;
    }
    if (opts.columns.some(c => c.id === opts.fillId)) {
      // A few px for the table's own border, so it never scrolls by a hair.
      next[opts.fillId] = Math.max(
        opts.fillMin,
        Math.floor(opts.width - used - 4),
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
    width,
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
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [containerRef, measure]);

  return sizing;
};
