import { parseContextTokenIdentityClaims, usePermissions } from '@/security';
import { contextTokenAtom } from '@/state/auth-atoms';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';

/**
 * Who is looking at the helpdesk, and how wide their view is.
 *
 * ONE PAGE, GATED BY ROLE. /tickets is the only ticket list. What differs
 * between a Netcorp service admin and a tenant user is which rows the server
 * returns and which controls are worth rendering, not which URL they are on.
 *
 * WHERE THE ANSWER COMES FROM
 * Roles come from `usePermissions`, which collects them from the Keycloak
 * tokens (profile, id_token, access_token). The security package is explicit
 * that roles must never be read from the context token, since that one is not
 * Keycloak-issued.
 *
 * The identity claims are the opposite: they come from the CONTEXT token only.
 * `principal_id` is the one that matters here. It is why the console does not
 * need a GUID in its route to know which principal it is working in.
 *
 * REPLACES the old usePrincipalAccess, which decoded the Keycloak access token
 * by hand to find `realm_access.roles`. That worked, but it reimplemented what
 * usePermissions already does and read the claim from a token the package
 * takes care to select deliberately.
 */

/**
 * Roles that mean "works across every tenant Netcorp holds".
 *
 * `multitenant.admin` is the live one: it is what the account running this
 * console carries, and what the helpdesk entry in `app_permissions` reports as
 * its role. The rest are kept because they already granted the principal
 * console before this hook existed, so narrowing to one role here would lock
 * out accounts that can reach it today.
 *
 * THIS LIST IS THE KNOB. When the other personas are decided, this is the one
 * place that says who sees everything.
 */
const SERVICE_ADMIN_ROLES = [
  'multitenant.admin',
  'multitenant.identity',
  'identity.admin',
  'principal.admin',
  'helpdesk.principal.agent',
] as const;

export interface HelpdeskAccess {
  isLoading: boolean;
  /** True for Netcorp staff who work across tenants. */
  isServiceAdmin: boolean;
  /** From the context token, never from the URL. Undefined for tenant users. */
  principalId?: string;
  tenantId?: string;
  organisationId?: string;
  /**
   * Every organisation the caller may reach, from `allowed_organisation_id`.
   * Already on the token, so the Organisation filter needs no request.
   */
  allowedOrganisationIds: string[];
}

/** JWT payload as claims, or null when the token is absent or malformed. */
const decodeClaims = (token: string | null): Record<string, unknown> | null => {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    // An undecodable token carries no claims rather than throwing and blanking
    // the page. The backend is the actual gate either way.
    return null;
  }
};

export const useHelpdeskAccess = (): HelpdeskAccess => {
  const { hasAnyRole, isLoading } = usePermissions();
  const contextToken = useAtomValue(contextTokenAtom);

  const claims = useMemo(() => decodeClaims(contextToken), [contextToken]);

  return useMemo(() => {
    const identity = parseContextTokenIdentityClaims(claims);
    const isServiceAdmin = hasAnyRole([...SERVICE_ADMIN_ROLES]);

    return {
      isLoading,
      isServiceAdmin,
      // Only meaningful for a service admin: a tenant user's rows come from
      // the tenant-scoped endpoint, which takes no principal.
      principalId: isServiceAdmin ? identity.principalId : undefined,
      tenantId: identity.tenantId,
      organisationId: identity.organisationId,
      allowedOrganisationIds: identity.allowedOrganisationIds ?? [],
    };
  }, [claims, hasAnyRole, isLoading]);
};
