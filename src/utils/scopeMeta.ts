import type {
  ServicesCoreAbstractionsRecordMeta,
  ServicesCoreAbstractionsScopePatch,
  ServicesCoreScopeAspNetCoreControllersBulkScopePatchResponse,
} from '@/api/helpdesk-client';
import type { BulkScopeSaveResult } from '@brainforgeau/components/bulk-scope-editor';
import type {
  ScopePatchWire,
  WireRecordMeta,
} from '@brainforgeau/components/scope-list';

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
 * Cast needed again as of `@brainforgeau/components` widening `ScopePatchWire.
 * visibility` to include `'Own'` (`Services.Core.Abstractions.Visibility.Own`,
 * restricts to `UserId == caller`) ahead of helpdesk-backend's own generated
 * `ServicesCoreAbstractionsScopePatch`, whose `visibility` is still the
 * 4-value enum from its last OpenAPI regeneration. Both remain the same wire
 * shape on the byte level (a string), so this is a cast, not a runtime
 * transform -- nothing in this repo's scope UI currently offers `'Own'` as a
 * selectable value, so the gap is unreachable today. Re-generate
 * the vendored helpdesk client (which will add `'Own'` to
 * `ServicesCoreAbstractionsVisibility`) to close it and drop this cast.
 */
export function toHelpdeskScopePatch(
  patch: ScopePatchWire,
): ServicesCoreAbstractionsScopePatch {
  return patch as unknown as ServicesCoreAbstractionsScopePatch;
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
