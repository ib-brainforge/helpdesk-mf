import { authorizedAxios, getAccessToken } from '@/state/authorizedAxios';
import {
  requireAssetApiBaseUrl,
  requireTrackingApiBaseUrl,
} from '@/state/config';
import { createIdentityApiClient } from '@/utils/identityApiClient';
import { ContextsApi } from '@brainforgeau/identity-management-client';
import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/**
 * Assets from asset-backend, for a ticket's linked assets.
 *
 * A linked asset holds an asset-backend id (LinkedAsset.AssetId), so
 * asset-backend is where its name comes from and where new links are chosen.
 *
 * SCOPE
 * asset-backend ignores TenantId and OrganisationId query parameters. It
 * answers only for the tenant, organisation and division named by the
 * X-Context-Token it receives. To list another organisation's assets, a
 * context token for THAT scope is issued from identity-management
 * (POST /v1/contexts/issue) and sent with these calls only. The app's own
 * context token is never replaced, so nothing else in helpdesk moves.
 *
 * The token is issued for the 'asset' app, not 'helpdesk': helpdesk is not
 * licensed for every tenant (Remondis refuses it with CTX_APP_NOT_LICENSED),
 * while asset is, and these are asset-backend calls. Checked on dev: an
 * asset-scoped token returns 443 assets for Remondis and 119 for Remondis NSW.
 */

export interface Asset {
  /** The id a linked asset stores. */
  id: string;
  /** The human asset number, e.g. "11". */
  assetId?: string | null;
  assetName?: string | null;
  registrationNo?: string | null;
}

export interface AssetScope {
  tenantId?: string | null;
  organisationId?: string | null;
}

interface AssetsPage {
  assets?: Asset[];
  totalCount?: number;
}

const PAGE_SIZE = 25;
const DEBOUNCE_MS = 250;

/** How an asset reads: its name, then number and registration when known. */
export const assetLabel = (a: Asset): string => {
  const name = a.assetName?.trim() || 'Unnamed asset';
  const extra = [a.assetId ? `#${a.assetId}` : null, a.registrationNo]
    .filter(Boolean)
    .join(' · ');
  return extra ? `${name} (${extra})` : name;
};

const useDebounced = <T>(value: T, ms: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
};

/**
 * A context token for one scope, for asset-backend calls only. Cached per
 * scope until shortly before it expires.
 */
const useScopeToken = (
  scope: AssetScope,
  enabled: boolean,
  app: 'asset' | 'tracking' = 'asset',
) =>
  useQuery({
    queryKey: [
      'assets',
      'scope-token',
      app,
      scope.tenantId ?? null,
      scope.organisationId ?? null,
    ],
    enabled: enabled && !!scope.tenantId,
    // Tokens last hours; refresh well before expiry rather than on a failed call.
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<string> => {
      const client = await createIdentityApiClient(ContextsApi);
      const { data } = await client.v1ContextsIssuePost({
        tenantId: scope.tenantId as string,
        organisationId: scope.organisationId ?? null,
        app,
      });
      if (!data?.token) throw new Error('No context token issued');
      return data.token;
    },
  });

/**
 * GET from asset-backend or tracking-backend. With a scope token the call is
 * answered for that scope; without one it falls back to the app's own context,
 * for tickets that carry no tenant.
 */
const scopedGet = async <T>(
  baseUrl: string,
  path: string,
  scopeToken: string | undefined,
  params?: Record<string, string | number | undefined>,
): Promise<T> => {
  const url = new URL(`${baseUrl}${path}`);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }
  if (!scopeToken) {
    const { data } = await authorizedAxios.get<T>(url.toString());
    return data;
  }
  // fetch, not authorizedAxios, on purpose: authorizedAxios's request
  // interceptor always overwrites X-Context-Token with the app's own token, so
  // it cannot carry a token for a different scope, which is the whole point of
  // this call. Authorization still comes from the same session.
  // biome-ignore lint/style/noRestrictedGlobals: authorizedAxios cannot send a scope-specific context token (see above)
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      'X-Context-Token': scopeToken,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`${res.status} for ${path}`);
  return (await res.json()) as T;
};

/**
 * One page of the scope's assets matching `search`, searched and paged by
 * asset-backend. The picker never loads a whole tenant, which can run to
 * hundreds (443 for Remondis), only what the current search returns.
 */
export const useAssetSearch = (
  search: string,
  scope: AssetScope,
  { enabled = true } = {},
) => {
  const term = useDebounced(search.trim(), DEBOUNCE_MS);
  const token = useScopeToken(scope, enabled);

  const query = useQuery({
    queryKey: [
      'assets',
      'search',
      scope.tenantId ?? null,
      scope.organisationId ?? null,
      term,
    ],
    enabled: enabled && !!scope.tenantId && !!token.data,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
    queryFn: () =>
      scopedGet<AssetsPage>(
        requireAssetApiBaseUrl(),
        '/v1/assets',
        token.data,
        {
          Search: term || undefined,
          Page: 1,
          PageSize: PAGE_SIZE,
        },
      ),
  });

  return {
    assets: query.data?.assets ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: token.isFetching || query.isFetching,
    isError: token.isError || query.isError,
  };
};

/**
 * The assets behind a ticket's linked asset ids, so they can be shown by name.
 *
 * Looked up with a token for the ticket's whole TENANT, not one organisation,
 * so an asset linked from any organisation in that tenant still resolves. One
 * request per id, each cached; a ticket links a handful at most. An id
 * asset-backend no longer knows (deleted, or outside the tenant) resolves to
 * null rather than failing the rest.
 */
export const useAssetsByIds = (
  ids: string[],
  ticketTenantId?: string | null,
) => {
  const token = useScopeToken({ tenantId: ticketTenantId }, ids.length > 0);
  const ready = !ticketTenantId || !!token.data || token.isError;

  const results = useQueries({
    queries: ids.map(id => ({
      queryKey: ['assets', 'by-id', ticketTenantId ?? null, id],
      enabled: ready,
      staleTime: 5 * 60 * 1000,
      retry: false,
      queryFn: async (): Promise<Asset | null> => {
        try {
          return await scopedGet<Asset>(
            requireAssetApiBaseUrl(),
            `/v1/assets/${id}`,
            token.data,
          );
        } catch {
          return null;
        }
      },
    })),
  });

  const byId: Record<string, Asset | null | undefined> = {};
  ids.forEach((id, i) => {
    byId[id] = results[i]?.data;
  });
  return byId;
};

interface TrackablesPage {
  items?: Array<{
    subjectSource?: string | null;
    subjectExternalId?: string | null;
  }>;
  totalCount?: number;
}

const TRACKABLES_PAGE = 500;
const TRACKABLES_MAX = 5000;

/**
 * The ids of the assets in a scope that exist in Tracking.
 *
 * "In Tracking" means Tracking holds a trackable connected to the asset
 * (subjectSource 'Asset', subjectExternalId the asset's id), not that it is
 * reporting right now. Assets reach Tracking through the Asset app, so an asset
 * missing here has not been connected.
 *
 * tracking-backend ignores filters on /v1/trackables but pages up to 500, so a
 * scope's trackables are read whole (one call for every tenant on dev; Netcorp
 * has 30) and matched here. The token is issued for the 'tracking' app.
 */
export const useTrackedAssetIds = (
  scope: AssetScope,
  { enabled = true } = {},
) => {
  const token = useScopeToken(scope, enabled, 'tracking');
  const query = useQuery({
    queryKey: [
      'assets',
      'tracked-ids',
      scope.tenantId ?? null,
      scope.organisationId ?? null,
    ],
    enabled: enabled && (!scope.tenantId || !!token.data),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Set<string>> => {
      const ids = new Set<string>();
      let seen = 0;
      for (let page = 1; seen < TRACKABLES_MAX; page++) {
        const data = await scopedGet<TrackablesPage>(
          requireTrackingApiBaseUrl(),
          '/v1/trackables',
          token.data,
          { Page: page, PageSize: TRACKABLES_PAGE },
        );
        const items = data?.items ?? [];
        for (const t of items) {
          if (t.subjectSource === 'Asset' && t.subjectExternalId) {
            ids.add(t.subjectExternalId);
          }
        }
        seen += items.length;
        if (items.length < TRACKABLES_PAGE || seen >= (data?.totalCount ?? 0)) {
          break;
        }
      }
      return ids;
    },
  });
  return {
    trackedIds: query.data,
    isLoading: token.isFetching || query.isFetching,
    isError: token.isError || query.isError,
  };
};
