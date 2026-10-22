import { CustomStatusesApi } from '@/api/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type {
  CreateCustomStatusRequest,
  CustomTicketStatusDto,
  UpdateCustomStatusRequest,
} from '@/types/custom-status';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const QUERY_KEY = 'helpdesk-custom-statuses';

export const useCustomStatuses = () => {
  const { data, isLoading, refetch } = useQuery<CustomTicketStatusDto[]>({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(CustomStatusesApi);
      const response = await client.v1CustomStatusesGet();
      return (response.data as unknown as CustomTicketStatusDto[]) ?? [];
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
      const client = await createHelpdeskApiClient(CustomStatusesApi);
      const response = await client.v1CustomStatusesPost(payload as never);
      return response.data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};

export const useUpdateCustomStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: { id: string; payload: UpdateCustomStatusRequest }) => {
      const client = await createHelpdeskApiClient(CustomStatusesApi);
      await client.v1CustomStatusesIdPut(id, payload as never);
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
      const client = await createHelpdeskApiClient(CustomStatusesApi);
      await client.v1CustomStatusesIdDelete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};
