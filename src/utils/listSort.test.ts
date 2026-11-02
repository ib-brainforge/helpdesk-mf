import { createColumnHelper } from '@tanstack/react-table';
import { describe, expect, it } from 'vitest';
import { toSortParam, withSortKeys } from './listSort';

const KEYS = { date: 'consignmentDate', consignmentNo: 'consignmentNo' };

describe('toSortParam', () => {
  it('is undefined with no sorting, so the server keeps its default order', () => {
    expect(toSortParam([], KEYS)).toBeUndefined();
  });

  it('sends the server key, ascending as is and descending with a leading dash', () => {
    expect(toSortParam([{ id: 'date', desc: false }], KEYS)).toBe(
      'consignmentDate',
    );
    expect(toSortParam([{ id: 'date', desc: true }], KEYS)).toBe(
      '-consignmentDate',
    );
  });

  it('keeps the order of several columns in a comma list', () => {
    expect(
      toSortParam(
        [
          { id: 'date', desc: true },
          { id: 'consignmentNo', desc: false },
        ],
        KEYS,
      ),
    ).toBe('-consignmentDate,consignmentNo');
  });

  it('drops an id with no server key instead of sending it', () => {
    expect(toSortParam([{ id: 'bogus', desc: true }], KEYS)).toBeUndefined();
    expect(
      toSortParam([{ id: 'toString', desc: false }], KEYS),
    ).toBeUndefined();
    expect(
      toSortParam(
        [
          { id: 'bogus', desc: false },
          { id: 'date', desc: false },
        ],
        KEYS,
      ),
    ).toBe('consignmentDate');
  });
});

describe('withSortKeys', () => {
  type Row = { consignmentNo: string; customerRef: string };
  const column = createColumnHelper<Row>();
  const columns = withSortKeys<Row>(
    [
      column.accessor('consignmentNo', { header: 'Number' }),
      column.accessor('customerRef', { header: 'Reference' }),
      column.display({ id: 'date', header: 'Date' }),
      column.display({ id: 'actions' }),
    ],
    KEYS,
  );

  it('enables sorting only on the columns that have a server key', () => {
    expect(columns.map(c => c.enableSorting)).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });
});
