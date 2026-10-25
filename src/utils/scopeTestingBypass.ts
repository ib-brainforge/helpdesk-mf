/**
 * Local-testing escape hatch -- MUST stay `false` on this branch.
 *
 * Mirrors asset-mf's/hr-mf's `SCOPE_TESTING_BYPASS_SINGLE_ORG` (DTO tenancy/
 * scope metadata initiative, ported to helpdesk-mf). The D6 single-
 * organisation suppression rule hides the entire scope UI (`ScopeBadge`/
 * `ListScopeStrip`/`RecordStrip`) for any tenant with zero or one
 * organisation -- there is nothing to test against otherwise. Setting this
 * `true` bypasses that suppression at every call site that references it
 * (every `useScopeList` call and every `useEntityScopeStrip` call) so the
 * feature can be exercised against a single/zero-organisation tenant.
 *
 * Deliberately its own dependency-free module rather than living in
 * `scopeMeta.ts` -- that file imports `@brainforgeau/components/scope-list`
 * (a real value import), which transitively pulls in `@heroui/react` (an
 * ESM-only package). Keeping this flag import-free avoids any route that
 * only needs the flag picking up that transitive dependency.
 *
 * Flip this to `true` locally when testing scope UI in such a tenant, but
 * never commit it as `true` -- it must ship disabled by default.
 */
export const SCOPE_TESTING_BYPASS_SINGLE_ORG = false;
