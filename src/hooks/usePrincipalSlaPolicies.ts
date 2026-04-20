/**
 * usePrincipalSlaPolicies — CRUD hooks for principal-scoped SLA policies.
 * Wraps PrincipalSlaPoliciesApi from the generated client.
 */

import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  type HelpdeskApplicationSlaCommandsCreateSlaPolicyCreatePrincipalSlaPolicyCommand,
  type HelpdeskApplicationSlaCommandsUpdateSlaPolicyUpdatePrincipalSlaPolicyCommand,
  PrincipalSlaPoliciesApi,
} from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const QUERY_KEY = 'principal-sla-policies';

export function usePrincipalSlaPolicies(principalId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, principalId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(PrincipalSlaPoliciesApi);
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
      const client = await createHelpdeskApiClient(PrincipalSlaPoliciesApi);
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
      command: HelpdeskApplicationSlaCommandsCreateSlaPolicyCreatePrincipalSlaPolicyCommand,
    ) => {
      const client = await createHelpdeskApiClient(PrincipalSlaPoliciesApi);
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
      command: HelpdeskApplicationSlaCommandsUpdateSlaPolicyUpdatePrincipalSlaPolicyCommand;
    }) => {
      const client = await createHelpdeskApiClient(PrincipalSlaPoliciesApi);
      await client.v1PrincipalsPrincipalIdSlaPoliciesIdPut(principalId, id, {
        ...command,
        id,
        principalId,
      });
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId, id] });
    },
  });
}

export function useDeletePrincipalSlaPolicy(principalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const client = await createHelpdeskApiClient(PrincipalSlaPoliciesApi);
      await client.v1PrincipalsPrincipalIdSlaPoliciesIdDelete(principalId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
    },
  });
}
