import { createIdentityApiClient } from '@/utils/identityApiClient';
import { ContextsApi } from '@brainforgeau/identity-management-client';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

interface ScopeName {
  tenantName?: string;
  organisationName?: string;
}

/** One selectable value in the scope filter. */
export interface ScopeOption {
  id: string;
  name: string;
  /** Present on organisations, so the picker can show which tenant they sit under. */
  parentName?: string;
  /**
   * The id of the level above: an organisation's tenant, a division's
   * organisation.
   *
   * This is what lets the pickers cascade. Choosing a tenant should leave the
   * Organisation list showing only that tenant's organisations, the way the
   * tracker pool's filters behave, rather than every organisation in the
   * estate with a hint about which tenant it belongs to. Without a parent id
   * the list can only be labelled, not narrowed.
   */
  parentId?: string;
}

export interface UseScopeNamesResult {
  /** tenant id -> its name. */
  byTenantId: Map<string, ScopeName>;
  /** organisation id -> its name. */
  byOrganisationId: Map<string, string>;
  isLoading: boolean;
  /**
   * The same payload, shaped for the scope filter.
   *
   * Deliberately derived from the request the Scope COLUMN already makes rather
   * than fetched again: /v1/contexts/available returns tenant, organisation and
   * division in one response, keyed by contextType, so three pickers cost zero
   * extra round trips.
   *
   * Only what the signed-in user can reach is returned, so these lists are their
   * access list, not the whole estate.
   */
  tenantOptions: ScopeOption[];
  organisationOptions: ScopeOption[];
  divisionOptions: ScopeOption[];
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

  const { tenantOptions, organisationOptions, divisionOptions } =
    useMemo(() => {
      const tenants = new Map<string, ScopeOption>();
      const orgs = new Map<string, ScopeOption>();
      const divisions = new Map<string, ScopeOption>();

      for (const c of (data ?? []) as Array<Record<string, unknown>>) {
        const tenantId = c.tenantId as string | undefined;
        const tenantName = c.tenantName as string | undefined;
        if (tenantId && !tenants.has(tenantId)) {
          tenants.set(tenantId, { id: tenantId, name: tenantName ?? tenantId });
        }

        // `organisationId` but `organizationName`: the spelling split is in the
        // payload, not a typo here. See the note above.
        const orgId = c.organisationId as string | undefined;
        const orgName = c.organizationName as string | undefined;
        if (orgId && !orgs.has(orgId)) {
          orgs.set(orgId, {
            id: orgId,
            name: orgName ?? orgId,
            parentName: tenantName,
            parentId: tenantId,
          });
        }

        const divId = c.divisionId as string | undefined;
        const divName = c.divisionName as string | undefined;
        if (divId && !divisions.has(divId)) {
          divisions.set(divId, {
            id: divId,
            name: divName ?? divId,
            parentName: orgName ?? tenantName,
            // A division hangs off an organisation, so that is its parent for
            // cascading. Falls back to the tenant for the same reason
            // parentName does: an org-less context still has a place in the
            // tree.
            parentId: orgId ?? tenantId,
          });
        }
      }

      const byName = (a: ScopeOption, b: ScopeOption) =>
        a.name.localeCompare(b.name);
      return {
        tenantOptions: [...tenants.values()].sort(byName),
        organisationOptions: [...orgs.values()].sort(byName),
        divisionOptions: [...divisions.values()].sort(byName),
      };
    }, [data]);

  // Memoised as one object, not returned as a fresh literal: callers put this
  // straight into a useMemo dependency list to build table columns, and a new
  // object every render would rebuild every column on every render.
  return useMemo(
    () => ({
      byTenantId,
      byOrganisationId,
      isLoading,
      tenantOptions,
      organisationOptions,
      divisionOptions,
    }),
    [
      byTenantId,
      byOrganisationId,
      isLoading,
      tenantOptions,
      organisationOptions,
      divisionOptions,
    ],
  );
};
