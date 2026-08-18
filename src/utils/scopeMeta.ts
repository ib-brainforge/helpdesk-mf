import type { BulkScopeSaveResult } from '@brainforgeau/components/bulk-scope-editor';
import type {
  ScopePatchWire,
  WireRecordMeta,
} from '@brainforgeau/components/scope-list';
import type {
  ServicesCoreAbstractionsRecordMeta,
  ServicesCoreAbstractionsScopePatch,
  ServicesCoreScopeAspNetCoreControllersBulkScopePatchResponse,
} from '@brainforgeau/helpdesk-client';

export {
  toScopeMeta,
  toClientVisibility,
  toScopePatch,
} from '@brainforgeau/components/scope-list';

/**
 * Bridges helpdesk-client's generated `ServicesCoreAbstractionsRecordMeta`
 * onto `@brainforgeau/components`'s `WireRecordMeta` -- the shape `toScopeMeta`
 * (and `useScopeList`'s `getMeta`) actually accept.
 *
 * A straight structural assignment isn't enough here, unlike asset-mf's/
 * hr-mf's backends: those register `RequiredMemberSchemaFilter`, so their
 * generated `RecordMeta.visibility`/`accessLevel`/`createdBy.userId` etc. are
 * correctly `required`. helpdesk-backend has not registered that filter yet,
 * so its generated `RecordMeta` still marks every nested field optional even
 * though they are always populated server-side (see `ScopeMetadataBuilder`)
 * -- the exact generator gap `WireRecordMeta`'s own doc comment describes
 * fleet-wide, just not yet closed for this backend. This is a cast, not a
 * runtime transform -- the wire values ARE always present.
 */
export function toWireMeta(
  meta: ServicesCoreAbstractionsRecordMeta | null | undefined,
): WireRecordMeta | null | undefined {
  return meta as unknown as WireRecordMeta | null | undefined;
}

/**
 * Bridges `@brainforgeau/components`'s `ScopePatchWire` onto the generated
 * `ServicesCoreAbstractionsScopePatch` -- the flat, RFC-7386-style merge
 * patch (key absent = unchanged, key present with `null` = cleared, key
 * present with a value = set) helpdesk-backend's `OptionalJsonConverter<T>`
 * actually (de)serializes.
 *
 * No cast needed as of helpdesk-backend merge `53170c91` ("register the
 * Optional OpenAPI filters"), which registers the same `OptionalDataContractResolver`
 * (`Services.Core.OpenApi`) asset-backend/hr-backend already had -- Swashbuckle
 * now reflects through `Optional<T>` to the flat wire shape instead of
 * emitting `Optional<T>`'s own CLR members (`{ isSet, value }`), so the
 * generated `ServicesCoreAbstractionsScopePatch` already matches
 * `ScopePatchWire` structurally (verified: both are `{ organisationId?:
 * string | null; divisionId?: string | null; visibility?: 'Default' |
 * 'Tenant' | 'Organisation' | 'Division'; userId?: string | null }`, modulo
 * the generated type's extra optional `tenantId`). Kept as a single named
 * seam rather than inlining the assignment at each call site so there's one
 * place to fix if a future backend field reintroduces a mismatch.
 */
export function toHelpdeskScopePatch(
  patch: ScopePatchWire,
): ServicesCoreAbstractionsScopePatch {
  return patch;
}

/**
 * Maps the generated `BulkScopePatchResponse` (`PATCH v1/scope/{entityType}`)
 * onto `BulkScopeEditor`'s `BulkScopeSaveResult` -- drops the per-record
 * `previous`/`current` snapshots (`BulkScopeEditor` derives its own current/
 * new preview from `getMeta` plus the pending edit, it doesn't need the
 * server to echo them back). Ported from asset-mf's/hr-mf's identical helper.
 *
 * Unlike hr-backend, helpdesk-backend has not registered
 * `RequiredMemberSchemaFilter` yet, so `results[].id`/`.outcome` are still
 * typed optional even though the backend always populates them -- defensive
 * fallbacks here (never actually hit) keep this assignable without a cast.
 */
export const toBulkScopeSaveResult = (
  response: ServicesCoreScopeAspNetCoreControllersBulkScopePatchResponse,
): BulkScopeSaveResult => ({
  results: (response.results ?? []).map(r => ({
    id: r.id ?? '',
    outcome: r.outcome ?? 'Unchanged',
    reason: r.reason ?? undefined,
  })),
  movedCount: response.movedCount ?? 0,
  unchangedCount: response.unchangedCount ?? 0,
  skippedCount: response.skippedCount ?? 0,
  notFoundCount: response.notFoundCount ?? 0,
});
