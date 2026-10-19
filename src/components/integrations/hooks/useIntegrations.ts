import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type {
  AddIntegrationRequest,
  IntegrationConfigDto,
  UpdateIntegrationRequest,
} from '@/types/integration';
import { IntegrationsApi } from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const INTEGRATIONS_KEY = 'helpdesk-integrations';

export const useIntegrations = () => {
  const { data, isLoading, refetch } = useQuery<IntegrationConfigDto[]>({
    queryKey: [INTEGRATIONS_KEY],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(IntegrationsApi);
      const response = await client.v1IntegrationsGet();
      return (response.data as unknown as IntegrationConfigDto[]) ?? [];
    },
  });

  return { integrations: data ?? [], isLoading, refetch };
};

export const useAddIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddIntegrationRequest) => {
      const client = await createHelpdeskApiClient(IntegrationsApi);
      const response = await client.v1IntegrationsPost(payload as never);
      return response.data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTEGRATIONS_KEY] });
    },
  });
};

export const useUpdateIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: { id: string; payload: UpdateIntegrationRequest }) => {
      const client = await createHelpdeskApiClient(IntegrationsApi);
      await client.v1IntegrationsIdPut(id, payload as never);
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
      const client = await createHelpdeskApiClient(IntegrationsApi);
      await client.v1IntegrationsIdDelete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTEGRATIONS_KEY] });
    },
  });
};
