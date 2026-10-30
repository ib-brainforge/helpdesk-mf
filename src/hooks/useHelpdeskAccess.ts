import { contextTokenAtom } from '@/state/auth-atoms';
import {
  parseContextTokenIdentityClaims,
  usePermissions,
} from '@brainforgeau/security';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';

/**
 * The caller's own tenant, organisation and reachable organisations, read from
 * the CONTEXT token's identity claims (never from the URL). Roles come from
 * `usePermissions`, never from the context token.
 */
export interface HelpdeskAccess {
  isLoading: boolean;
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
  const { isLoading } = usePermissions();
  const contextToken = useAtomValue(contextTokenAtom);

  const claims = useMemo(() => decodeClaims(contextToken), [contextToken]);

  return useMemo(() => {
    const identity = parseContextTokenIdentityClaims(claims);
    return {
      isLoading,
      tenantId: identity.tenantId,
      organisationId: identity.organisationId,
      allowedOrganisationIds: identity.allowedOrganisationIds ?? [],
    };
  }, [claims, isLoading]);
};
