/**
 * usePrincipalAccess — resolves the caller's effective role in a principal's helpdesk console.
 *
 * Role hierarchy (mirrors identity-mf and billing-mf):
 *   admin  — multitenant.admin | multitenant.identity | principal.admin
 *   agent  — helpdesk.principal.agent (and not already admin)
 *   null   — no qualifying role
 *
 * Roles are read from the Keycloak JWT. No backend call is needed: the backend
 * validates the role on each request, so this only decides what to render.
 *
 * WHICH TOKEN, AND WHY IT MATTERS
 * This used to read `useAuth().user.profile` alone. That is the wrong token.
 * oidc-client-ts populates `profile` from the ID TOKEN, and Keycloak puts
 * `realm_access.roles` in the ACCESS TOKEN only, unless someone ticks "Add to
 * ID token" on the realm-roles mapper. On the dev realm it is not ticked, so
 * `profile` carries no role claim of any kind and `extractRoles` returned an
 * empty set for every caller. The console was unreachable even for accounts
 * holding multitenant.admin, which looks exactly like a missing grant and sent
 * us hunting for one.
 *
 * The access token is the better source regardless: it is the token sent to the
 * API, so reading roles from it means the UI and the backend are deciding from
 * the same claims. The ID token is still consulted, for realms that do put
 * roles there.
 */

import { useAuth } from '@brainforgeau/security';
import { useMemo } from 'react';

export type PrincipalAccessLevel = 'admin' | 'agent' | null;

export interface UsePrincipalAccessResult {
  isLoading: boolean;
  level: PrincipalAccessLevel;
}

/** Roles that make someone an admin of a principal's helpdesk (Netcorp staff). */
export const PRINCIPAL_ADMIN_ROLES = [
  'multitenant.admin',
  'multitenant.identity',
  'principal.admin',
] as const;
const AGENT_ROLES = ['helpdesk.principal.agent'] as const;

/** JWT payload as a claims object, or null if the token is absent or malformed. */
function decodeJwtClaims(
  token: string | undefined,
): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    // base64url → base64, then re-pad: atob rejects both.
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    // Undecodable token: treat as carrying no roles rather than throwing and
    // blanking the page. The backend is the actual gate.
    return null;
  }
}

function addRolesFrom(
  claims: Record<string, unknown> | null,
  roles: Set<string>,
): void {
  if (!claims) return;
  const add = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(v => typeof v === 'string' && roles.add(v));
    } else if (typeof value === 'string') {
      roles.add(value);
    }
  };
  add(claims.roles);
  add(claims.role);
  add((claims.realm_access as Record<string, unknown>)?.roles);
}

export function usePrincipalAccess(
  _principalId: string,
): UsePrincipalAccessResult {
  const { user, isLoading: authLoading } = useAuth();

  const level = useMemo((): PrincipalAccessLevel => {
    if (!user) return null;

    const roles = new Set<string>();
    addRolesFrom(decodeJwtClaims(user.access_token), roles);
    addRolesFrom(
      (user.profile ?? null) as Record<string, unknown> | null,
      roles,
    );

    const isAdmin = PRINCIPAL_ADMIN_ROLES.some(r => roles.has(r));
    if (isAdmin) return 'admin';

    const isAgent = AGENT_ROLES.some(r => roles.has(r));
    if (isAgent) return 'agent';

    return null;
  }, [user]);

  return { isLoading: authLoading ?? false, level };
}
