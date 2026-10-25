import { useDebounced } from '@/hooks/useDebounced';
import { useSearchParams } from '@modern-js/runtime/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/*
 * A server-paged list's search, filters, sort and page, kept in the address
 * bar so Back and a copied link reopen the same page. Two lists on one page
 * keep apart by `prefix` ("org" writes orgq, orgpage, ...). Nothing is
 * written for a default, so an untouched list leaves a clean URL.
 *
 * Pass `flags` and `sorts` as module constants: they are compared by identity.
 */

export const PAGE_SIZES = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

export type SortDir = 'asc' | 'desc';

export interface ListParamsState<F extends string, S extends string> {
  /** What the server is asked for: the search once typing has settled. */
  search: string;
  flags: Record<F, boolean>;
  sort: S;
  dir: SortDir;
  /** 1-based. */
  page: number;
  pageSize: number;
}

export const useListParams = <F extends string, S extends string>({
  prefix = '',
  flags: flagNames,
  sorts,
  defaultSort,
  defaultDir = 'asc',
}: {
  prefix?: string;
  flags: readonly F[];
  sorts: readonly S[];
  defaultSort: S;
  defaultDir?: SortDir;
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const k = useCallback((name: string) => `${prefix}${name}`, [prefix]);

  const params = useMemo((): ListParamsState<F, S> => {
    const sort = searchParams.get(k('sort')) as S | null;
    const dir = searchParams.get(k('dir'));
    const page = Number(searchParams.get(k('page')));
    const size = Number(searchParams.get(k('size')));
    return {
      search: searchParams.get(k('q')) ?? '',
      flags: Object.fromEntries(
        flagNames.map(f => [f, searchParams.get(k(f)) === '1']),
      ) as Record<F, boolean>,
      sort: sort && sorts.includes(sort) ? sort : defaultSort,
      dir: dir === 'asc' || dir === 'desc' ? dir : defaultDir,
      page: Number.isInteger(page) && page > 1 ? page : 1,
      pageSize: (PAGE_SIZES as readonly number[]).includes(size)
        ? size
        : DEFAULT_PAGE_SIZE,
    };
  }, [searchParams, k, flagNames, sorts, defaultSort, defaultDir]);

  /** Any change but the page itself goes back to page 1. */
  const update = useCallback(
    (patch: Partial<ListParamsState<F, S>>) => {
      setSearchParams(
        prev => {
          const next = { ...params, page: 1, ...patch };
          const put = (name: string, value: string | null) => {
            if (value === null) prev.delete(k(name));
            else prev.set(k(name), value);
          };
          put('q', next.search.trim() || null);
          for (const f of flagNames) put(f, next.flags[f] ? '1' : null);
          put('sort', next.sort === defaultSort ? null : next.sort);
          put('dir', next.dir === defaultDir ? null : next.dir);
          put('page', next.page > 1 ? String(next.page) : null);
          put(
            'size',
            next.pageSize === DEFAULT_PAGE_SIZE ? null : String(next.pageSize),
          );
          return prev;
        },
        { replace: true },
      );
    },
    [params, setSearchParams, k, flagNames, defaultSort, defaultDir],
  );

  // The box shows every keystroke; the server is asked once typing settles.
  const [searchText, setSearchText] = useState(params.search);
  const settled = useDebounced(searchText, 300);
  // Only a new settled value is written, so Clear and Back are not undone
  // by a stale one.
  const lastSettled = useRef(settled);
  useEffect(() => {
    if (settled === lastSettled.current) return;
    lastSettled.current = settled;
    if (settled.trim() !== params.search) update({ search: settled });
  }, [settled, params.search, update]);

  const hasFilters =
    Boolean(params.search) || flagNames.some(f => params.flags[f]);
  const clear = () => {
    setSearchText('');
    update({
      search: '',
      flags: Object.fromEntries(flagNames.map(f => [f, false])) as Record<
        F,
        boolean
      >,
    });
  };

  return { params, update, searchText, setSearchText, hasFilters, clear };
};
