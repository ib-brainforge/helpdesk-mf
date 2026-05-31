/**
 * usePrincipal — fetches a principal by ID from identity-management.
 *
 * Used by principal-scoped pages to resolve the principal's display name for
 * async breadcrumb params (replacing the permanent PendingCrumb skeleton
 * that was left in W1-P6 / W1-P7 / W1-P8 while no hook existed).
 *
 * Uses AdminPrincipalsApi from @brainforgeau/identity-management-client.
 * Stale time: 5 minutes — principals don't change often.
 */

import { createIdentityApiClient } from '@/utils/identityApiClient';
import {
  AdminPrincipalsApi,
  type PrincipalDto,
} from '@brainforgeau/identity-management-client';
import { useQuery } from '@tanstack/react-query';

export interface UsePrincipalResult {
  data: PrincipalDto | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function usePrincipal(principalId: string | undefined): UsePrincipalResult {
  const query = useQuery({
    queryKey: ['principal', principalId],
    enabled: Boolean(principalId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async (): Promise<PrincipalDto> => {
      const client = await createIdentityApiClient(AdminPrincipalsApi);
      const response = await client.v1AdminPrincipalsPrincipalIdGet(principalId!);
      return response.data;
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
