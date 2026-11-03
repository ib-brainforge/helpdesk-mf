import { useDebounced } from '@/hooks/useDebounced';
import { selectedContextAtom } from '@/state/auth-atoms';
import { contextQueryKeyAtom } from '@/state/context-query-key';
import { helpdeskAppQueryOptions } from '@/state/helpdesk-app-query';
import { createIdentityApiClient } from '@/utils/identityApiClient';
import { AppsApi } from '@brainforgeau/identity-management-client';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { UserOption } from '../state/users-dropdown-state';
import {
  type AssigneeScope,
  MAX_IDS,
  type ScopeParams,
  fetchAssigneePage,
  intersectionRequest,
  keepWhileScopeUnchanged,
  toOption,
} from './assigneeLookup';

export type { AssigneeScope } from './assigneeLookup';

/**
 * Who a ticket can be assigned to.
 *
 * ONE SOURCE
 * identity-management answers this directly: the people holding a helpdesk
 * role that reaches the scope (`GET v1/apps/{appId}/assignable-users/options`).
 * Helpdesk access is granted by role, and platform staff are not members of
 * the tenants whose tickets they work, so membership lists cannot answer it.
 * The endpoint searches and pages on the server and returns each person's name
 * and email, so nothing here reads a whole scope and no separate name lookup is
 * needed.
 *
 * SCOPE
 * A tenant, organisation and division name where the ticket sits; levels left
 * out are not constrained. The tenant is always sent: app-staff callers must
 * name one, so a caller with no tenant of its own gets the signed-in context's.
 * For bulk assign, `scopes` takes several and returns only the people
 * assignable in EVERY one.
 *
 * SELECTED PEOPLE
 * A current assignee may not be on the loaded page. `selectedIds` are looked up
 * by id (at most 100, never combined with a search) so they can still be named.
 *
 * AVATARS
 * The endpoint returns no avatar, so options carry none and pickers show
 * initials.
 *
 * `enabled: false` fetches nothing. For pickers rendered many times over, such
 * as the quick-assign cell on every unassigned grid row, which should load only
 * once its menu is opened.
 */

export interface ScopedAssignees {
  options: UserOption[];
  isLoading: boolean;
  isError: boolean;
  /** Whether more people match than the page returned. */
  hasMore: boolean;
}

export interface AssigneeQueryOptions {
  enabled?: boolean;
  /** Typed search text; debounced here and searched on the server. */
  search?: string;
  /** People that must be nameable even when outside the loaded page. */
  selectedIds?: string[];
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 250;

const useAssigneeOptions = (
  scopeParams: ScopeParams,
  scopeKey: string,
  disabled: boolean,
  {
    enabled = true,
    search = '',
    selectedIds = [],
    pageSize = DEFAULT_PAGE_SIZE,
  }: AssigneeQueryOptions,
): ScopedAssignees => {
  const contextKey = useAtomValue(contextQueryKeyAtom);
  const term = useDebounced(search.trim(), SEARCH_DEBOUNCE_MS);
  const active = enabled && !disabled;

  const app = useQuery({ ...helpdeskAppQueryOptions, enabled: active });
  const appId = app.data?.id;

  const list = useQuery({
    queryKey: ['assignees', 'options', contextKey, scopeKey, term, pageSize],
    enabled: active && !!appId,
    staleTime: 60 * 1000,
    placeholderData: keepWhileScopeUnchanged(contextKey, scopeKey),
    queryFn: async ({ signal }) =>
      fetchAssigneePage(
        await createIdentityApiClient(AppsApi),
        appId as string,
        scopeParams,
        { search: term, pageSize, signal },
      ),
  });

  const listed = useMemo(
    () => (list.data?.items ?? []).flatMap(toOption),
    [list.data],
  );

  const missing = useMemo(() => {
    const onPage = new Set(listed.map(o => o.id));
    return [...new Set(selectedIds)]
      .filter(id => id && !onPage.has(id))
      .slice(0, MAX_IDS)
      .sort();
  }, [listed, selectedIds]);

  const named = useQuery({
    queryKey: ['assignees', 'by-id', contextKey, scopeKey, missing],
    enabled: active && !!appId && !!list.data && missing.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async ({ signal }) =>
      fetchAssigneePage(
        await createIdentityApiClient(AppsApi),
        appId as string,
        scopeParams,
        { ids: missing, pageSize: MAX_IDS, signal },
      ),
  });

  const options = useMemo(
    () => [...listed, ...(named.data?.items ?? []).flatMap(toOption)],
    [listed, named.data],
  );

  return {
    options,
    // Loading covers a refetch too, so callers never read a stale or partial
    // list as the final answer.
    isLoading:
      active &&
      (app.isLoading || (!!appId && (list.isPending || list.isFetching))),
    isError:
      active &&
      (app.isError ||
        list.isError ||
        named.isError ||
        (app.isSuccess && !appId)),
    hasMore: (list.data?.totalCount ?? 0) > listed.length,
  };
};

/**
 * Everyone a ticket in this scope can be assigned to: one page matching
 * `search`, plus the `selectedIds` that fall outside it.
 */
export const useScopedAssignees = (
  scope: AssigneeScope,
  opts: AssigneeQueryOptions = {},
): ScopedAssignees => {
  const context = useAtomValue(selectedContextAtom);
  const tenantId = scope.tenantId ?? context?.tenantId ?? undefined;
  const organisationId = scope.organisationId ?? undefined;
  const divisionId = scope.divisionId ?? undefined;
  return useAssigneeOptions(
    { tenantId, organisationId, divisionId },
    `${tenantId ?? ''}:${organisationId ?? ''}:${divisionId ?? ''}`,
    false,
    opts,
  );
};

/**
 * Only the people assignable in EVERY one of the given scopes.
 *
 * For bulk assign across a selection spanning organisations: anyone offered
 * here can work every selected ticket. A mixed selection can legitimately
 * produce nobody, and callers should say so rather than show an empty list.
 * The endpoint takes at most 25 distinct scopes; beyond that the lookup is not
 * made, `isError` is set and `tooManyScopes` is true.
 */
export const useScopedAssigneesIntersection = (
  scopes: AssigneeScope[],
  opts: AssigneeQueryOptions = {},
): ScopedAssignees & { scopeCount: number; tooManyScopes: boolean } => {
  const context = useAtomValue(selectedContextAtom);
  const fallbackTenant = context?.tenantId;
  const { tokens, tooMany } = useMemo(
    () => intersectionRequest(scopes, fallbackTenant),
    [scopes, fallbackTenant],
  );
  const result = useAssigneeOptions(
    { scopes: tokens },
    tokens.join('|'),
    tokens.length === 0 || tooMany,
    opts,
  );
  return {
    ...result,
    isError: result.isError || tooMany,
    scopeCount: tokens.length,
    tooManyScopes: tooMany,
  };
};
