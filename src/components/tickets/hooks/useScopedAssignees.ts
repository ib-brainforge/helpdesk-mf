import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import type { UserInfo } from '@/hooks/useUserEnrichment';
import { contextQueryKeyAtom } from '@/state/context-query-key';
import { helpdeskAppQueryOptions } from '@/state/helpdesk-app-query';
import type { TicketFilters } from '@/types/ticket';
import { createIdentityApiClient } from '@/utils/identityApiClient';
import { UserAppAssignmentsApi } from '@brainforgeau/identity-management-client';
import {
  type QueryFunctionContext,
  useQueries,
  useQuery,
} from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { UserOption } from '../state/users-dropdown-state';
import { ticketCountsQueryOptions } from './useTicketCounts';

/**
 * Who a ticket can be assigned to.
 *
 * WHAT THIS REPLACES
 * Every assignee picker used to share `usersMutationAtom`, which called
 * `UsersApi.v1UsersGet(undefined, ...)`. That answers for the caller's context
 * and returned about three people, none of whom were the agents actually
 * holding tickets. The assignee rail beside it showed only people who already
 * held work, so someone who had never been given a ticket could be found in
 * neither place.
 *
 * WHERE "ASSIGNABLE" COMES FROM
 * Helpdesk access is granted by ROLE, not by being a member of a tenant.
 * Platform staff in particular are not members of the tenants whose tickets
 * they work, so every tenant or organisation membership list comes back
 * without them. Their access lives in identity-management's app role
 * assignments, one row per person per role, each placed at a tenant,
 * organisation or division. That placement is exactly the scoping a picker
 * needs, so it is the primary source.
 *
 * WHY CURRENT ASSIGNEES ARE ADDED
 * Role data is not complete everywhere. On dev, role writes stopped silently
 * (V5-918) and the helpdesk role table holds a single person, while the agents
 * working tickets have no assignment at all. Relying on roles alone would make
 * the picker shrink below the people already doing the work. So anyone
 * currently holding tickets in the scope is included too, from the counts
 * endpoint that already answers exactly that. People with a role and no
 * tickets still appear, which is the point of the exercise.
 *
 * NAMES
 * Neither source carries names. `useUserEnrichment` resolves them in one bulk
 * request, by id and across tenants, the same lookup that names the rail.
 */

export interface AssigneeScope {
  tenantId?: string | null;
  organisationId?: string | null;
  divisionId?: string | null;
}

export interface ScopedAssignees {
  options: UserOption[];
  isLoading: boolean;
  isError: boolean;
}

type RoleAssignment = {
  keycloakUserId?: string | null;
  tenantId?: string | null;
  organisationId?: string | null;
  divisionId?: string | null;
};

const PAGE_SIZE = 500;
const MAX_ROWS = 5000;

/**
 * Every active helpdesk role assignment. One row per person per role, so this
 * stays small: it is loaded once and matched against any number of scopes in
 * the browser.
 */
const fetchHelpdeskAssignments = async ({
  client,
}: QueryFunctionContext): Promise<RoleAssignment[]> => {
  // The app id comes from the shared helpdesk app query, so the app itself is
  // fetched once per session however many callers need it.
  const app = await client.fetchQuery(helpdeskAppQueryOptions);
  const appId = app?.id;
  if (!appId) return [];

  const api = await createIdentityApiClient(UserAppAssignmentsApi);
  const rows: RoleAssignment[] = [];
  for (let page = 1; rows.length < MAX_ROWS; page++) {
    const { data } = await api.v1UserAppAssignmentsGet(
      undefined, // keycloakUserId: everyone
      appId,
      undefined, // tenantId: all, placement is matched per scope below
      undefined, // organisationId
      undefined, // divisionId
      undefined, // effectiveAtContext
      true, // isActive
      false, // includeScopes
      page,
      PAGE_SIZE,
    );
    const batch = (
      Array.isArray(data)
        ? data
        : ((data as { items?: unknown[] } | undefined)?.items ?? [])
    ) as RoleAssignment[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
};

const rolesQuery = (contextKey: unknown) => ({
  queryKey: ['assignees', 'helpdesk-roles', contextKey],
  queryFn: fetchHelpdeskAssignments,
  // Role assignments change rarely; a picker opening should not re-fetch them.
  staleTime: 5 * 60 * 1000,
});

/**
 * Whether a role's placement reaches a ticket's scope.
 *
 * A role placed with no tenant is platform-wide. A tenant-level role reaches
 * every organisation in its tenant, an organisation-level role reaches that
 * organisation's divisions, and so on down.
 *
 * A ticket with no organisation belongs to the tenant as a whole, so a role
 * placed on any organisation within that tenant still reaches it. Most tickets
 * are scoped this way (roughly 12,000 of 14,000 locally), so excluding
 * organisation-level roles there would leave them with almost nobody.
 */
const covers = (a: RoleAssignment, s: AssigneeScope): boolean => {
  if (!a.tenantId) return true;
  if (s.tenantId && a.tenantId !== s.tenantId) return false;
  if (
    a.organisationId &&
    s.organisationId &&
    a.organisationId !== s.organisationId
  ) {
    return false;
  }
  if (a.divisionId && s.divisionId && a.divisionId !== s.divisionId) {
    return false;
  }
  return true;
};

/** The counts endpoint's filters for a scope, only the levels it names. The tenant is always the caller's own. */
const scopeFilters = (s: AssigneeScope): TicketFilters => {
  const f: TicketFilters = {};
  if (s.organisationId) f.organisationId = [s.organisationId];
  if (s.divisionId) f.divisionId = s.divisionId;
  return f;
};

/** Everyone reachable in one scope: role holders plus current ticket holders. */
const assignableIds = (
  roles: RoleAssignment[] | undefined,
  holders: { assigneeId: string }[] | undefined,
  scope: AssigneeScope,
): Set<string> => {
  const ids = new Set<string>();
  for (const a of roles ?? []) {
    if (a.keycloakUserId && covers(a, scope)) ids.add(a.keycloakUserId);
  }
  for (const h of holders ?? []) ids.add(h.assigneeId);
  return ids;
};

/**
 * Ids to picker options, sorted by name.
 *
 * Only people whose name has resolved are offered. `useUserEnrichment` keeps
 * the two unresolved states apart, and both are left out:
 *
 * - `null` means the directory cannot find the id: a deleted account or seeded
 *   data. Offering it would put a stranger's GUID in the list.
 * - `undefined` means the lookup has not returned yet. These used to be offered
 *   under the first eight characters of their id, which both flashed raw ids at
 *   the user and sorted the list by id. The dropdown then kept that order when
 *   the real names arrived, because it holds its first-seen order for items
 *   whose keys have not changed, so the list stayed in id order for good. Waiting
 *   until names are known means the first render is already in name order.
 */
const toOptions = (
  ids: string[],
  userMap: Record<string, UserInfo | null>,
): UserOption[] =>
  ids
    .flatMap(id => {
      const u = userMap[id];
      if (!u) return [];
      return [{ id, name: u.name, email: u.email, avatarUrl: u.avatarUrl }];
    })
    .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Everyone a ticket in this scope can be assigned to.
 *
 * `enabled: false` fetches nothing. For pickers rendered many times over, such
 * as the quick-assign cell on every unassigned grid row, which should only
 * load once its menu is actually opened.
 */
export const useScopedAssignees = (
  scope: AssigneeScope,
  { enabled = true }: { enabled?: boolean } = {},
): ScopedAssignees => {
  const contextKey = useAtomValue(contextQueryKeyAtom);

  const roles = useQuery({ ...rolesQuery(contextKey), enabled });
  const counts = useQuery({
    ...ticketCountsQueryOptions(scopeFilters(scope), false),
    enabled,
  });

  const ids = useMemo(
    () => [...assignableIds(roles.data, counts.data?.assignees, scope)],
    // Scope is compared by its parts: callers build it inline each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      roles.data,
      counts.data,
      scope.tenantId,
      scope.organisationId,
      scope.divisionId,
    ],
  );

  const { userMap, isLoading: loadingNames } = useUserEnrichment(ids);
  const options = useMemo(() => toOptions(ids, userMap), [ids, userMap]);

  return {
    options,
    isLoading: roles.isLoading || counts.isLoading || loadingNames,
    isError: roles.isError || counts.isError,
  };
};

const scopeKey = (s: AssigneeScope) =>
  `${s.tenantId ?? ''}|${s.organisationId ?? ''}|${s.divisionId ?? ''}`;

/**
 * Only the people assignable in EVERY one of the given scopes.
 *
 * For bulk assign across a selection spanning organisations: anyone offered
 * here can work every selected ticket, so a bulk assignment never puts someone
 * on a ticket outside their reach. A mixed selection can legitimately produce
 * nobody, and callers should say so rather than show an empty list.
 *
 * `enabled: false` fetches nothing, for a modal that stays mounted while shut.
 */
export const useScopedAssigneesIntersection = (
  scopes: AssigneeScope[],
  { enabled = true }: { enabled?: boolean } = {},
): ScopedAssignees & { scopeCount: number } => {
  const contextKey = useAtomValue(contextQueryKeyAtom);

  const distinct = useMemo(() => {
    const seen = new Map<string, AssigneeScope>();
    for (const s of scopes) seen.set(scopeKey(s), s);
    return [...seen.values()];
  }, [scopes]);

  const roles = useQuery({ ...rolesQuery(contextKey), enabled });
  const counts = useQueries({
    queries: distinct.map(s => ({
      ...ticketCountsQueryOptions(scopeFilters(s), false),
      enabled,
    })),
  });

  const countsLoading = counts.some(c => c.isLoading);
  const ids = useMemo(() => {
    if (roles.isLoading || countsLoading || distinct.length === 0) return [];
    const perScope = distinct.map((s, i) =>
      assignableIds(roles.data, counts[i]?.data?.assignees, s),
    );
    const [first, ...rest] = perScope;
    return [...first].filter(id => rest.every(set => set.has(id)));
  }, [roles.data, roles.isLoading, counts, countsLoading, distinct]);

  const { userMap, isLoading: loadingNames } = useUserEnrichment(ids);
  const options = useMemo(() => toOptions(ids, userMap), [ids, userMap]);

  return {
    options,
    isLoading: roles.isLoading || countsLoading || loadingNames,
    isError: roles.isError || counts.some(c => c.isError),
    scopeCount: distinct.length,
  };
};

/**
 * Case-insensitive match on name or email. Neither source has a search
 * parameter, so the scope is loaded once and this is the search.
 */
export const filterAssignees = (
  options: UserOption[],
  query: string,
): UserOption[] => {
  const needle = query.trim().toLowerCase();
  if (!needle) return options;
  return options.filter(
    o =>
      o.name.toLowerCase().includes(needle) ||
      (o.email ?? '').toLowerCase().includes(needle),
  );
};
