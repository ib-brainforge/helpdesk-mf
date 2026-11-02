import type { ColumnDefArray } from '@brainforgeau/components/page';
import type { ColumnDef, SortingState } from '@tanstack/react-table';

/**
 * The columns of one list that the server can sort, as `{ columnId: serverKey }`. The server key
 * is a key of the endpoint's sort whitelist (the `sort` parameter in its swagger). A column that
 * is not in the map is not sortable.
 */
export type SortKeys = Readonly<Record<string, string>>;

/**
 * Turns the table's sorting into the `sort` argument of a list endpoint: server keys, a leading
 * `-` for descending, comma separated, in the order the user chose them. Returns `undefined` for
 * no sorting so the server keeps its default order. An id with no server key is dropped (a stale
 * link can carry one), never sent, because the server answers an unknown key with 400.
 */
export function toSortParam(
  sorting: SortingState,
  keys: SortKeys,
): string | undefined {
  const parts = sorting.flatMap(({ id, desc }) => {
    const key = Object.hasOwn(keys, id) ? keys[id] : undefined;
    return key ? [desc ? `-${key}` : key] : [];
  });
  return parts.length > 0 ? parts.join(',') : undefined;
}

const columnId = (column: ColumnDef<any, any>): string | undefined =>
  column.id ??
  ('accessorKey' in column ? String(column.accessorKey) : undefined);

/**
 * Sorting on exactly the columns in `keys`: those get `enableSorting: true`, every other column
 * `enableSorting: false`. TanStack only sorts a column that has an accessor, so a display column
 * in `keys` gets a no-value accessor; its cell still renders from the row, and the server does
 * the ordering.
 */
export function withSortKeys<T>(
  columns: ColumnDefArray<T>,
  keys: SortKeys,
): ColumnDefArray<T> {
  return columns.map(column => {
    const id = columnId(column);
    const sortable = id !== undefined && Object.hasOwn(keys, id);
    const hasAccessor = 'accessorFn' in column || 'accessorKey' in column;
    return {
      ...column,
      enableSorting: sortable,
      ...(sortable && !hasAccessor ? { accessorFn: () => undefined } : {}),
    } as ColumnDefArray<T>[number];
  });
}
