import { createIdentityApiClient } from '@/utils/identityApiClient';
import { ContextsApi } from '@brainforgeau/identity-management-client';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

interface ScopeName {
  tenantName?: string;
  organisationName?: string;
}

export interface UseScopeNamesResult {
  /** tenant id -> its name. */
  byTenantId: Map<string, ScopeName>;
  /** organisation id -> its name. */
  byOrganisationId: Map<string, string>;
  isLoading: boolean;
}

/**
 * Tenant and organisation NAMES, keyed by id.
 *
 * Tickets carry `tenantId` and `organisationId` but no names: those live in
 * identity-management, and having the helpdesk resolve them would mean a
 * cross-service call per page of tickets to produce something the browser
 * already holds.
 *
 * /v1/contexts/available is the list the context switcher is built from, so it
 * is fetched once per session anyway and returns exactly what is needed:
 *
 *   { tenantId, tenantName, organisationId, organizationName, divisionId, ... }
 *
 * Note the spelling split in that payload: `organisationId` but
 * `organizationName`. Both are reproduced verbatim below rather than
 * normalised, because guessing either way silently yields undefined.
 *
 * Only contexts the signed-in user can reach are returned, so a ticket from a
 * tenant outside their access resolves to nothing. Callers fall back to the id.
 */
export const useScopeNames = (): UseScopeNamesResult => {
  const { data, isLoading } = useQuery({
    queryKey: ['scope-names'],
    // Tenants and organisations are near-static; refetching them while someone
    // pages through tickets would be pure noise.
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const client = await createIdentityApiClient(ContextsApi);
      const { data } = await client.v1ContextsAvailableGet();
      return data ?? [];
    },
  });

  const byTenantId = useMemo(() => {
    const map = new Map<string, ScopeName>();
    for (const c of (data ?? []) as Array<Record<string, unknown>>) {
      const tenantId = c.tenantId as string | undefined;
      if (!tenantId) continue;
      const existing = map.get(tenantId) ?? {};
      map.set(tenantId, {
        tenantName: (c.tenantName as string) ?? existing.tenantName,
        organisationName: existing.organisationName,
      });
    }
    return map;
  }, [data]);

  const byOrganisationId = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of (data ?? []) as Array<Record<string, unknown>>) {
      const orgId = c.organisationId as string | undefined;
      // `organizationName` with a z, see the note above.
      const orgName = c.organizationName as string | undefined;
      if (orgId && orgName) map.set(orgId, orgName);
    }
    return map;
  }, [data]);

  // Memoised as one object, not returned as a fresh literal: callers put this
  // straight into a useMemo dependency list to build table columns, and a new
  // object every render would rebuild every column on every render.
  return useMemo(
    () => ({ byTenantId, byOrganisationId, isLoading }),
    [byTenantId, byOrganisationId, isLoading],
  );
};
