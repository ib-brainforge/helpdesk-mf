import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authorizedAxios } from '@/state/authorizedAxios';
import { configAtom } from '@/state/config';
import { getDefaultStore } from 'jotai';
import type { IntegrationConfigDto, AddIntegrationRequest, UpdateIntegrationRequest } from '@/types/integration';
import type { RuntimeConfig } from '@brainforgeau/security';

// REVIEW: Using authorizedAxios directly until helpdesk-client is updated with Wave 7.4 endpoints (backend PR #62).
// Replace with IntegrationsApi from @brainforgeau/helpdesk-client once available.

const store = getDefaultStore();

function getBaseUrl(): string {
  const config = store.get(configAtom) as RuntimeConfig;
  return config?.api?.baseUrl ?? '';
}

const INTEGRATIONS_KEY = 'helpdesk-integrations';

export const useIntegrations = () => {
  const { data, isLoading, refetch } = useQuery<IntegrationConfigDto[]>({
    queryKey: [INTEGRATIONS_KEY],
    queryFn: async () => {
      const baseUrl = getBaseUrl();
      const response = await authorizedAxios.get<IntegrationConfigDto[]>(
        `${baseUrl}/v1/integrations`,
      );
      return response.data ?? [];
    },
  });

  return { integrations: data ?? [], isLoading, refetch };
};

export const useAddIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddIntegrationRequest) => {
      const baseUrl = getBaseUrl();
      const response = await authorizedAxios.post<string>(
        `${baseUrl}/v1/integrations`,
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTEGRATIONS_KEY] });
    },
  });
};

export const useUpdateIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateIntegrationRequest }) => {
      const baseUrl = getBaseUrl();
      await authorizedAxios.put(`${baseUrl}/v1/integrations/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTEGRATIONS_KEY] });
    },
  });
};

export const useDeleteIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const baseUrl = getBaseUrl();
      await authorizedAxios.delete(`${baseUrl}/v1/integrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTEGRATIONS_KEY] });
    },
  });
};
