import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authorizedAxios } from '@/state/authorizedAxios';
import { configAtom } from '@/state/config';
import { getDefaultStore } from 'jotai';
import type {
  CustomTicketStatusDto,
  CreateCustomStatusRequest,
  UpdateCustomStatusRequest,
} from '@/types/custom-status';
import type { RuntimeConfig } from '@brainforgeau/security';

// REVIEW: Using authorizedAxios directly until helpdesk-client is updated with Wave 7.1 endpoints (backend PR #59).
// Replace with CustomStatusesApi from @brainforgeau/helpdesk-client once available.

const store = getDefaultStore();

function getBaseUrl(): string {
  const config = store.get(configAtom) as RuntimeConfig;
  return config?.api?.baseUrl ?? '';
}

const QUERY_KEY = 'helpdesk-custom-statuses';

export const useCustomStatuses = () => {
  const { data, isLoading, refetch } = useQuery<CustomTicketStatusDto[]>({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const baseUrl = getBaseUrl();
      const response = await authorizedAxios.get<CustomTicketStatusDto[]>(
        `${baseUrl}/v1/custom-statuses`,
      );
      return response.data ?? [];
    },
  });

  return {
    customStatuses: data ?? [],
    isLoading,
    refetch,
  };
};

export const useCreateCustomStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCustomStatusRequest) => {
      const baseUrl = getBaseUrl();
      const response = await authorizedAxios.post<string>(
        `${baseUrl}/v1/custom-statuses`,
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};

export const useUpdateCustomStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateCustomStatusRequest }) => {
      const baseUrl = getBaseUrl();
      await authorizedAxios.put(`${baseUrl}/v1/custom-statuses/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};

export const useDeleteCustomStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const baseUrl = getBaseUrl();
      await authorizedAxios.delete(`${baseUrl}/v1/custom-statuses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};
