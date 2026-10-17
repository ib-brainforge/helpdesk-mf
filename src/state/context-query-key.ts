import { contextQueryKey } from '@brainforgeau/security/query';
import { atom } from 'jotai';
import { selectedContextAtom } from './auth-atoms';

/**
 * Atom that provides a unique context identifier for query keys.
 * This ensures that queries are scoped to the current tenant/org/division context.
 * When the context changes, all queries with this key segment will be invalidated.
 *
 * Derives its value from `contextQueryKey()` — the package's single source of
 * truth for context identity. `selectedContextAtom` is read only to trigger
 * recomputation when the context changes; the identity string itself always
 * comes from the shared function, never re-derived locally.
 *
 * Usage in useQuery:
 * ```ts
 * const contextKey = useAtomValue(contextQueryKeyAtom);
 * const query = useQuery({
 *   queryKey: ['my-query', contextKey],
 *   // ...
 * });
 * ```
 */
export const contextQueryKeyAtom = atom(get => {
  get(selectedContextAtom);
  return contextQueryKey();
});
