import { atom } from 'jotai';
import { buildContextId } from '@brainforgeau/security';
import { selectedContextAtom } from './auth-atoms';

/**
 * Atom that provides a unique context identifier for query keys.
 * This ensures that queries are scoped to the current tenant/org/division context.
 * When the context changes, all queries with this key segment will be invalidated.
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
export const contextQueryKeyAtom = atom((get) => {
  const selectedContext = get(selectedContextAtom);
  return selectedContext ? buildContextId(selectedContext) : 'no-context';
});
