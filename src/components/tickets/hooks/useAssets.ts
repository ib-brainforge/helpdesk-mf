import {
  requireAssetApiBaseUrl,
  requireTrackingApiBaseUrl,
} from '@/state/config';
import { createScopedApiClient } from '@/state/scopedApiClient';
import {
  Configuration as AssetConfiguration,
  type AssetDto,
  type AssetListItemDto,
  AssetsApi,
} from '@brainforgeau/asset-backend-client';
import {
  TrackablesApi,
  Configuration as TrackingConfiguration,
} from '@brainforgeau/tracking-client';
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
 * X-Context-Token it receives. To list another organisation's assets, the
 * calls go through a client scoped to THAT organisation (see
 * createScopedApiClient), which sends a context token issued for it with these
 * calls only. The app's own context token is never replaced, so nothing else
 * in helpdesk moves.
 *
 * The token is issued for the 'asset' app, not 'helpdesk': helpdesk is not
 * licensed for every tenant (Remondis refuses it with CTX_APP_NOT_LICENSED),
 * while asset is, and these are asset-backend calls. Checked on dev: an
 * asset-scoped token returns 443 assets for Remondis and 119 for Remondis NSW.
 */

/**
 * The fields of an asset the helpdesk shows. The registration number is only
 * on the single-asset DTO; asset-backend's list items do not carry it.
 */
export type Asset = Pick<AssetListItemDto, 'id' | 'assetId' | 'assetName'> &
  Partial<Pick<AssetDto, 'registrationNo'>>;

export interface AssetScope {
  tenantId?: string | null;
  organisationId?: string | null;
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
 * The asset-backend client for a scope. Calls are answered for that scope;
 * with no tenant they use the app's own context, for tickets that carry none.
 */
const assetsApi = (scope: AssetScope) =>
  createScopedApiClient(
    AssetsApi,
    new AssetConfiguration({ basePath: requireAssetApiBaseUrl() }),
    'asset',
    scope,
  );

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

  const query = useQuery({
    queryKey: [
      'assets',
      'search',
      scope.tenantId ?? null,
      scope.organisationId ?? null,
      term,
    ],
    enabled: enabled && !!scope.tenantId,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const client = await assetsApi(scope);
      const { data } = await client.v1AssetsGet(
        undefined, // status
        undefined, // assetTypeId
        undefined, // assetSubTypeId
        undefined, // assetGroupId
        undefined, // assetSubGroupId
        undefined, // manufacturerId
        undefined, // manufacturerModelId
        term || undefined, // search
        undefined, // fuelType
        undefined, // isPowered
        undefined, // hasServiceExclusions
        undefined, // ownershipModel
        1, // page
        PAGE_SIZE, // pageSize
      );
      return data;
    },
  });

  const assets: Asset[] = query.data?.assets ?? [];
  return {
    assets,
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isFetching,
    isError: query.isError,
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
  const results = useQueries({
    queries: ids.map(id => ({
      queryKey: ['assets', 'by-id', ticketTenantId ?? null, id],
      staleTime: 5 * 60 * 1000,
      retry: false,
      queryFn: async (): Promise<Asset | null> => {
        try {
          const client = await assetsApi({ tenantId: ticketTenantId });
          const { data } = await client.v1AssetsIdGet(id);
          return data;
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
 * scope's trackables are read whole (a single call for a small tenant) and
 * matched here. The client is scoped to the 'tracking' app.
 */
export const useTrackedAssetIds = (
  scope: AssetScope,
  { enabled = true } = {},
) => {
  const query = useQuery({
    queryKey: [
      'assets',
      'tracked-ids',
      scope.tenantId ?? null,
      scope.organisationId ?? null,
    ],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Set<string>> => {
      const client = await createScopedApiClient(
        TrackablesApi,
        new TrackingConfiguration({ basePath: requireTrackingApiBaseUrl() }),
        'tracking',
        scope,
      );
      const ids = new Set<string>();
      let seen = 0;
      for (let page = 1; seen < TRACKABLES_MAX; page++) {
        const { data } = await client.v1TrackablesGet(
          undefined, // search
          undefined, // groupId
          undefined, // displayProfileName
          undefined, // visibilityGroupId
          undefined, // displayProfileId
          undefined, // isTrackingActive
          undefined, // hasTracker
          undefined, // trackerConnected
          page,
          TRACKABLES_PAGE, // pageSize
          undefined, // orderBy
          undefined, // sortDirection
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
    isLoading: query.isFetching,
    isError: query.isError,
  };
};
