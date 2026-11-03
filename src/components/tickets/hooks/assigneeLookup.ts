import type { AppsApi } from '@brainforgeau/identity-management-client';
import type { UserOption } from '../state/users-dropdown-state';

/** The endpoint's limits. */
export const MAX_IDS = 100;
export const MAX_SCOPES = 25;

export interface AssigneeScope {
  tenantId?: string | null;
  organisationId?: string | null;
  divisionId?: string | null;
}

/** One scope as separate parameters, or several as `tenant:org:division` tokens. */
export interface ScopeParams {
  tenantId?: string;
  organisationId?: string;
  divisionId?: string;
  scopes?: string[];
}

interface AssigneeOptionDto {
  id?: string | null;
  label?: string | null;
  code?: string | null;
}

/** label is the display name and code the email. */
export const toOption = (o: AssigneeOptionDto): UserOption[] =>
  o.id
    ? [
        {
          id: o.id,
          name: o.label || o.code || 'Unnamed',
          email: o.code ?? undefined,
        },
      ]
    : [];

/** `tenant:organisation:division`, empty segments allowed: the form the endpoint parses. */
export const scopeToken = (s: AssigneeScope, fallbackTenant?: string | null) =>
  `${s.tenantId ?? fallbackTenant ?? ''}:${s.organisationId ?? ''}:${s.divisionId ?? ''}`;

/** The distinct scope tokens of a selection, and whether it is too many to ask about. */
export const intersectionRequest = (
  scopes: AssigneeScope[],
  fallbackTenant?: string | null,
) => {
  const tokens = [
    ...new Set(scopes.map(s => scopeToken(s, fallbackTenant))),
  ].sort();
  return { tokens, tooMany: tokens.length > MAX_SCOPES };
};

/**
 * One page of assignable people. A search and ids are never sent together:
 * with `ids` the search is dropped and the page is the id lookup.
 */
export const fetchAssigneePage = async (
  api: Pick<AppsApi, 'v1AppsAppIdAssignableUsersOptionsGet'>,
  appId: string,
  scope: ScopeParams,
  {
    search,
    ids,
    pageSize,
    signal,
  }: {
    search?: string;
    ids?: string[];
    pageSize: number;
    signal?: AbortSignal;
  },
) => {
  const byIds = !!ids && ids.length > 0;
  const { data } = await api.v1AppsAppIdAssignableUsersOptionsGet(
    appId,
    scope.tenantId,
    scope.organisationId,
    scope.divisionId,
    scope.scopes,
    byIds ? undefined : search || undefined,
    byIds ? ids : undefined,
    1,
    pageSize,
    { signal },
  );
  return data;
};

/**
 * Keeps the previous result on screen only while the scope is unchanged (the
 * user typing a search). A different scope or context never shows the previous
 * scope's people. Query keys are ['assignees', kind, contextKey, scopeKey, ...].
 */
export const keepWhileScopeUnchanged =
  (contextKey: unknown, scopeKey: string) =>
  <T>(
    previous: T | undefined,
    previousQuery: { queryKey: readonly unknown[] } | undefined,
  ): T | undefined =>
    previousQuery &&
    previousQuery.queryKey[2] === contextKey &&
    previousQuery.queryKey[3] === scopeKey
      ? previous
      : undefined;
