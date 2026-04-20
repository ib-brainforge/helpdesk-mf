/**
 * usePrincipalSlaPolicies — CRUD hooks for principal-scoped SLA policies.
 *
 * The published @brainforgeau/helpdesk-client does not yet export PrincipalSlaPoliciesApi
 * or the Principal-prefixed command types. We use SlaApi as the class token and cast to
 * `any` to call the principal-scoped methods at runtime.
 *
 * REVIEW: Remove casts once helpdesk-backend republishes with PrincipalSlaPoliciesApi exported.
 */

import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  type HelpdeskApplicationSlaCommandsCreateSlaPolicyCreateSlaPolicyCommand,
  type HelpdeskApplicationSlaCommandsUpdateSlaPolicyUpdateSlaPolicyCommand,
  SlaApi,
} from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const QUERY_KEY = 'principal-sla-policies';

export function usePrincipalSlaPolicies(principalId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, principalId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(SlaApi);
      const response =
        await client.v1PrincipalsPrincipalIdSlaPoliciesGet(principalId);
      return response.data ?? [];
    },
    enabled: Boolean(principalId),
  });
}

export function usePrincipalSlaPolicy(principalId: string, id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, principalId, id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(SlaApi);
      const response = await client.v1PrincipalsPrincipalIdSlaPoliciesIdGet(
        principalId,
        id,
      );
      return response.data;
    },
    enabled: Boolean(principalId) && Boolean(id),
  });
}

export function useCreatePrincipalSlaPolicy(principalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      command: HelpdeskApplicationSlaCommandsCreateSlaPolicyCreateSlaPolicyCommand,
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(SlaApi);
      const response = await client.v1PrincipalsPrincipalIdSlaPoliciesPost(
        principalId,
        {
          ...command,
          principalId,
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
    },
  });
}

export function useUpdatePrincipalSlaPolicy(principalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      command,
    }: {
      id: string;
      command: HelpdeskApplicationSlaCommandsUpdateSlaPolicyUpdateSlaPolicyCommand;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(SlaApi);
      await client.v1PrincipalsPrincipalIdSlaPoliciesIdPut(principalId, id, {
        ...command,
        id,
        principalId,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId, variables.id] });
    },
  });
}

export function useDeletePrincipalSlaPolicy(principalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(SlaApi);
      await client.v1PrincipalsPrincipalIdSlaPoliciesIdDelete(principalId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
    },
  });
}
