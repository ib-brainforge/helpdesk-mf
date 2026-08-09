import { ScopePermissions } from '@/constants/permissions';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import { selectedContextAtom } from '@/state/auth-atoms';
import { requireIdentityApiBaseUrl } from '@/state/config';
import { toScopeMeta, toScopePatch, toWireMeta } from '@/utils/scopeMeta';
import { SCOPE_TESTING_BYPASS_SINGLE_ORG } from '@/utils/scopeTestingBypass';
import type { ScopeStripPatch, SelectOption } from '@brainforgeau/components';
import type { RecordMeta } from '@brainforgeau/components/scope-badge';
import type {
  ServicesCoreAbstractionsRecordMeta,
  ServicesCoreAbstractionsScopePatch,
} from '@brainforgeau/helpdesk-client';
import { useAccessScope, usePermissions } from '@brainforgeau/security';
import { toast } from '@heroui/react';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useState } from 'react';

/**
 * DTO tenancy/scope metadata initiative -- shared `ContextScopeStrip`
 * wiring hook for helpdesk-mf detail (or detail-equivalent, e.g. an entity
 * editor modal) screens. Ported from asset-mf's `useEntityScopeStrip`
 * (PR #369) rather than hand-authoring the same ~80 lines once per screen.
 *
 * Unlike asset-mf/hr-mf, this MF has no `useUsersSearch` debounced-search
 * hook, so the User level of the Tenant -> Organisation -> Division -> User
 * placement chain has no picker wired here yet -- `users` is always `[]`,
 * matching hr-mf's own precedent on the employee detail page (its own doc
 * comment: "this vertical slice covers the Organisation/Division/Visibility
 * placement chain only; the User level has no picker wired here yet").
 * `ownerUserName` is still resolved (read-only) via `useUserEnrichment`, the
 * same id->name lookup every other user reference in this app uses.
 */

interface UseEntityScopeStripArgsBase {
  /** Human-readable singular label used in toasts (e.g. "Custom status", "Canned response"). */
  entityLabel: string;
  /** The record's embedded wire-shape `meta` (e.g. `status.meta`). */
  meta: ServicesCoreAbstractionsRecordMeta | null | undefined;
  /** Calls `ScopeApi.v1ScopeEntityTypeIdPatch(entityType, id, patch)` -- entityType/id already bound by the caller. */
  patchScope: (patch: ServicesCoreAbstractionsScopePatch) => Promise<unknown>;
}

/**
 * Single-entity DETAIL PAGE mode -- the record is loaded via its own
 * dedicated `useQuery` (keyed by id/slug), so a post-save refetch that 404s
 * reliably means "moved outside the viewer's context" (the shared tenant
 * filter). Use for a route the user can deep-link straight to (e.g.
 * `/configuration/approval-workflows/[id]`, `/knowledge-base/[slug]`).
 */
interface UseEntityScopeStripDetailArgs<TEntity>
  extends UseEntityScopeStripArgsBase {
  mode: 'detail';
  queryClient: QueryClient;
  /** The exact query key this entity's own `useQuery` is keyed on. */
  queryKey: QueryKey;
  /** Re-fetches the entity -- same queryFn the page's own `useQuery` already uses. */
  fetchEntity: () => Promise<TEntity>;
  /** Fires when the post-save refetch 404s -- i.e. the record moved outside the viewer's context. */
  onGone: (destinationName: string | null) => void;
}

/**
 * Simple MODAL EDITOR mode -- the record has no dedicated single-GET
 * endpoint (only a list endpoint backs it), so a 404-after-refetch
 * move-detection isn't available. `onSaved` fires unconditionally after a
 * successful PATCH -- the caller invalidates its own list query and closes
 * the modal (there's no "record moved" full-page state for a config-list
 * editor, unlike a detail-route page the user navigated to directly).
 */
interface UseEntityScopeStripModalArgs extends UseEntityScopeStripArgsBase {
  mode: 'modal';
  onSaved: () => void;
}

export type UseEntityScopeStripArgs<TEntity> =
  | UseEntityScopeStripDetailArgs<TEntity>
  | UseEntityScopeStripModalArgs;

export function useEntityScopeStrip<TEntity>(
  args: UseEntityScopeStripArgs<TEntity>,
) {
  const { entityLabel, meta, patchScope } = args;
  const selectedContext = useAtomValue(selectedContextAtom);
  const { accessScope, organisationCount } = useAccessScope(
    selectedContext?.tenantId,
    { identityBaseUrl: requireIdentityApiBaseUrl() },
  );
  const { hasPermission } = usePermissions();
  const canManageScope = hasPermission(ScopePermissions.Manage);
  const currentOrganisationId = selectedContext?.organisationId;
  const currentDivisionId = selectedContext?.divisionId;
  const currentContextName =
    selectedContext?.divisionName ??
    selectedContext?.organizationName ??
    selectedContext?.tenantName ??
    'your current context';

  const scopeOrganisations: SelectOption[] = (accessScope?.organisations ?? [])
    .filter((org): org is typeof org & { id: string } => Boolean(org.id))
    .map(org => ({ id: org.id, name: org.name ?? org.id }));

  // Mirrors ContextScopeStrip's internally-selected Organisation so the
  // Division options can be re-filtered as the user changes it.
  const [scopeEditOrganisationId, setScopeEditOrganisationId] = useState<
    string | null
  >(meta?.organisationId ?? null);
  const scopeDivisions: SelectOption[] = (
    scopeOrganisations.length && scopeEditOrganisationId
      ? (accessScope?.organisations?.find(
          org => org.id === scopeEditOrganisationId,
        )?.divisions ?? [])
      : []
  )
    .filter((div): div is typeof div & { id: string } => Boolean(div.id))
    .map(div => ({ id: div.id, name: div.name ?? div.id }));

  const scopeOwnerOrganisation = accessScope?.organisations?.find(
    org => org.id === meta?.organisationId,
  );
  const scopeOwnerDivision = scopeOwnerOrganisation?.divisions?.find(
    div => div.id === meta?.divisionId,
  );
  const scopeOwnerName = meta?.organisationId
    ? (scopeOwnerOrganisation?.name ?? 'another organisation')
    : (accessScope?.tenantName ?? 'tenant level');
  const scopeOwnerDivisionName = scopeOwnerDivision?.name;

  // Read-only id->name resolution for the record's current `userId` (if
  // any) -- no picker for this level yet, see this module's own doc comment.
  const { userMap: scopeOwnerUserMap } = useUserEnrichment([meta?.userId]);
  const scopeOwnerUserName = meta?.userId
    ? scopeOwnerUserMap[meta.userId]?.name
    : undefined;

  const handleScopeSave = async (patch: ScopeStripPatch) => {
    const scopePatchWire = toScopePatch(patch);
    await patchScope(
      // See `toHelpdeskScopePatch`'s own doc comment (@/utils/scopeMeta) for
      // why this cast is needed for helpdesk-backend specifically.
      scopePatchWire as unknown as ServicesCoreAbstractionsScopePatch,
    );

    const destinationOrganisationId =
      'organisationId' in scopePatchWire
        ? scopePatchWire.organisationId
        : meta?.organisationId;
    const destinationDivisionId =
      'divisionId' in scopePatchWire
        ? scopePatchWire.divisionId
        : meta?.divisionId;
    const destinationOrganisation = accessScope?.organisations?.find(
      org => org.id === destinationOrganisationId,
    );
    const destinationDivision = destinationOrganisation?.divisions?.find(
      div => div.id === destinationDivisionId,
    );
    const destinationName =
      destinationDivision?.name ??
      destinationOrganisation?.name ??
      (destinationOrganisationId ? null : (accessScope?.tenantName ?? null));

    // Modal-editor mode: no single-GET move-detection available (see this
    // module's own doc comment on `UseEntityScopeStripModalArgs`) -- the
    // caller invalidates its own list query and closes the modal.
    if (args.mode === 'modal') {
      args.onSaved();
      toast(
        destinationName
          ? `Scope updated — ${entityLabel.toLowerCase()} moved to ${destinationName}`
          : `${entityLabel} scope updated`,
        { variant: 'success' },
      );
      return;
    }

    // Detail-page mode: refetch synchronously (queryClient.fetchQuery
    // throws on a non-2xx response, unlike useQuery's own `refetch()`) so we
    // can tell -- before toasting -- whether the record is still visible in
    // the viewer's context (re-render with the fresh scope) or moved
    // outside it (the shared tenant filter 404s the follow-up GET).
    try {
      await args.queryClient.fetchQuery({
        queryKey: args.queryKey,
        queryFn: args.fetchEntity,
        retry: false,
        staleTime: 0,
      });
      toast(`${entityLabel} scope updated`, { variant: 'success' });
    } catch {
      args.queryClient.setQueryData(args.queryKey, undefined);
      args.onGone(destinationName);
      toast(
        destinationName
          ? `Scope updated — ${entityLabel.toLowerCase()} moved to ${destinationName}`
          : `Scope updated — ${entityLabel.toLowerCase()} moved outside your current context`,
        { variant: 'success' },
      );
    }
  };

  const recordMeta = toScopeMeta(toWireMeta(meta)) as
    | RecordMeta
    | null
    | undefined;

  return {
    /** Spread directly onto `<ContextScopeStrip {...stripProps} />`. */
    stripProps: {
      meta: recordMeta,
      ownerName: scopeOwnerName,
      ownerDivisionName: scopeOwnerDivisionName,
      currentContextName,
      currentOrganisationId,
      currentDivisionId,
      organisationCount,
      // REVIEW: TEMPORARY -- see SCOPE_TESTING_BYPASS_SINGLE_ORG's doc
      // comment in scopeTestingBypass.ts. Remove this line to revert.
      bypassSingleOrganisationSuppressionForTesting:
        SCOPE_TESTING_BYPASS_SINGLE_ORG,
      canManageScope,
      organisations: scopeOrganisations,
      divisions: scopeDivisions,
      users: [] as SelectOption[],
      ownerUserName: scopeOwnerUserName,
      // allowClearUser intentionally omitted (defaults false) -- no picker
      // for this level yet, see this module's own doc comment.
      onOrganisationChange: setScopeEditOrganisationId,
      onSave: handleScopeSave,
    },
    /** `RecordMeta`, ready for `<MetadataPanel meta={metaForPanel} .../>`. */
    metaForPanel: recordMeta,
    /** Ready for `<MetadataPanel scopeBadge={scopeBadge} .../>`. */
    scopeBadge: { organisationCount, currentOrganisationId, currentDivisionId },
  };
}
