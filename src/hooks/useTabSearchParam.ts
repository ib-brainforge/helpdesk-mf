/**
 * useTabSearchParam — canonical React Router adapter for useDetailTabState.
 *
 * Returns stable `getParam` / `setParam` callbacks wired to
 * @modern-js/runtime/router's `useSearchParams`. Each consumer calls this
 * once and passes the results directly into `useDetailTabState`.
 *
 * ## Usage
 * ```tsx
 * import { useTabSearchParam } from '@/hooks/useTabSearchParam';
 * import { useDetailTabState } from '@brainforgeau/components/page';
 *
 * const { getParam, setParam } = useTabSearchParam();
 * const { activeTab, setActiveTab } = useDetailTabState({
 *   defaultTab: 'details',
 *   getParam,
 *   setParam,
 * });
 * ```
 *
 * Established in W1-P7 as the single canonical helpdesk-mf wrapper so
 * W1-P8 and future PR authors copy one import rather than inlining the
 * `useCallback` dance each time.
 */

import { useSearchParams } from '@modern-js/runtime/router';
import { useCallback } from 'react';

export interface TabSearchParamResult {
  getParam: (key: string) => string | null;
  setParam: (key: string, value: string) => void;
}

export function useTabSearchParam(): TabSearchParamResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const getParam = useCallback(
    (key: string) => searchParams.get(key),
    [searchParams],
  );

  const setParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(prev => {
        prev.set(key, value);
        return prev;
      });
    },
    [setSearchParams],
  );

  return { getParam, setParam };
}
