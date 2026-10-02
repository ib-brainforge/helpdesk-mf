import { useScopeNames } from '@/hooks/useScopeNames';
import type { UserInfo } from '@/hooks/useUserEnrichment';
import { contextQueryKeyAtom } from '@/state/context-query-key';
import { createIdentityApiClient } from '@/utils/identityApiClient';
import { UsersApi } from '@brainforgeau/identity-management-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';

/**
 * The people and places whose NAME matches the search text, as ids.
 *
 * WHY THE FRONTEND DOES THIS
 * The ticket search matches subject, id, category, status, priority and the
 * submitter's email itself. But assignee and requester names, and tenant,
 * organisation and division names, live in identity-management, and the
 * helpdesk backend makes no calls to identity. So the names are matched here
 * and sent as ids (searchUserIds, searchScopeIds); the backend then also
 * matches tickets assigned to, raised by, or placed in any of them.
 *
 * WHERE THE NAMES COME FROM
 * - Places: useScopeNames, which already holds every tenant, organisation and
 *   division the user can see.
 * - People: identity's user search for the text, plus every name already shown
 *   on the page (the user-enrichment cache that names rows and the rail), so a
 *   requester from another tenant is found when they are on screen.
 *
 * Two characters minimum. One letter would match most of the directory and
 * every organisation, and the backend's own text match covers it anyway.
 */
const MIN_CHARS = 2;

export const useSearchMatches = (searchTerm?: string) => {
  const term = (searchTerm ?? '').trim().toLowerCase();
  const active = term.length >= MIN_CHARS;
  const queryClient = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  const {
    tenantOptions,
    organisationOptions,
    divisionOptions,
    isLoading: scopesLoading,
  } = useScopeNames();

  const directory = useQuery({
    queryKey: ['ticket-search', 'people', contextKey, term],
    enabled: active,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<string[]> => {
      const client = await createIdentityApiClient(UsersApi);
      const { data } = await client.v1UsersGet(
        undefined, // tenantId: the caller's context
        undefined, // isActive: include former staff, their tickets remain
        term,
        false, // includeServiceAccounts
        true, // includeUsersWithoutMembership
        1,
        50,
      );
      const rows = (
        Array.isArray(data)
          ? data
          : ((data as { items?: unknown[] } | undefined)?.items ?? [])
      ) as Array<{ keycloakUserId?: string | null; id?: string | null }>;
      return rows
        .map(u => u.keycloakUserId ?? u.id)
        .filter((id): id is string => !!id);
    },
  });

  const scopeIds = useMemo(() => {
    if (!active) return [];
    return [...tenantOptions, ...organisationOptions, ...divisionOptions]
      .filter(o => o.name.toLowerCase().includes(term))
      .map(o => o.id)
      .sort();
  }, [active, term, tenantOptions, organisationOptions, divisionOptions]);

  const userIds = useMemo(() => {
    if (!active) return [];
    const ids = new Set(directory.data ?? []);
    // Names already resolved for the page: rows, the assignee rail, pickers.
    for (const q of queryClient
      .getQueryCache()
      .findAll({ queryKey: ['user-enrichment'] })) {
      const map = q.state.data as Record<string, UserInfo | null> | undefined;
      if (!map) continue;
      for (const [id, user] of Object.entries(map)) {
        if (!user) continue;
        const haystack = `${user.name} ${user.email ?? ''}`.toLowerCase();
        if (haystack.includes(term)) ids.add(id);
      }
    }
    return [...ids].sort();
  }, [active, term, directory.data, queryClient]);

  return {
    userIds,
    scopeIds,
    /** False only while a name lookup the search depends on is still running. */
    ready: !active || (!directory.isLoading && !scopesLoading),
  };
};
