/**
 * usePrincipalAccess — resolves the caller's effective role in a principal's helpdesk console.
 *
 * Role hierarchy (mirrors identity-mf and billing-mf):
 *   admin  — multitenant.admin | multitenant.identity | principal.admin
 *   agent  — helpdesk.principal.agent (and not already admin)
 *   null   — no qualifying role
 *
 * Roles are read directly from the Keycloak JWT via useAuth().user.profile.
 * No backend call is needed — the backend validates the role on each request.
 */

import { useAuth } from '@brainforgeau/security';
import { useMemo } from 'react';

export type PrincipalAccessLevel = 'admin' | 'agent' | null;

export interface UsePrincipalAccessResult {
  isLoading: boolean;
  level: PrincipalAccessLevel;
}

const ADMIN_ROLES = [
  'multitenant.admin',
  'multitenant.identity',
  'principal.admin',
] as const;
const AGENT_ROLES = ['helpdesk.principal.agent'] as const;

function extractRoles(profile: Record<string, unknown>): Set<string> {
  const roles = new Set<string>();
  const addRoles = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(v => typeof v === 'string' && roles.add(v));
    } else if (typeof value === 'string') {
      roles.add(value);
    }
  };
  addRoles(profile.roles);
  addRoles(profile.role);
  addRoles((profile.realm_access as Record<string, unknown>)?.roles);
  return roles;
}

export function usePrincipalAccess(
  _principalId: string,
): UsePrincipalAccessResult {
  const { user, isLoading: authLoading } = useAuth();

  const level = useMemo((): PrincipalAccessLevel => {
    if (!user?.profile) return null;
    const profile = user.profile as Record<string, unknown>;
    const roles = extractRoles(profile);

    const isAdmin = ADMIN_ROLES.some(r => roles.has(r));
    if (isAdmin) return 'admin';

    const isAgent = AGENT_ROLES.some(r => roles.has(r));
    if (isAgent) return 'agent';

    return null;
  }, [user?.profile]);

  return { isLoading: authLoading ?? false, level };
}
