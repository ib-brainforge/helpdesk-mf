import {
  CustomPrioritiesApi,
  type HelpdeskApplicationCustomPrioritiesDTOsCustomPriorityDto,
} from '@/api/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type CustomPriorityDto =
  HelpdeskApplicationCustomPrioritiesDTOsCustomPriorityDto;

export interface CustomPriorityPayload {
  name: string;
  color: string;
  sortOrder: number;
}

export const CUSTOM_PRIORITIES_QUERY_KEY = 'helpdesk-custom-priorities';

export const useCustomPriorities = () => {
  const { data, isLoading, refetch } = useQuery<CustomPriorityDto[]>({
    queryKey: [CUSTOM_PRIORITIES_QUERY_KEY],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(CustomPrioritiesApi);
      const response = await client.v1CustomPrioritiesGet();
      return response.data ?? [];
    },
  });
  return { customPriorities: data ?? [], isLoading, refetch };
};

export const useCreateCustomPriority = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CustomPriorityPayload) => {
      const client = await createHelpdeskApiClient(CustomPrioritiesApi);
      const response = await client.v1CustomPrioritiesPost(payload);
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [CUSTOM_PRIORITIES_QUERY_KEY],
      }),
  });
};

export const useUpdateCustomPriority = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: { id: string; payload: CustomPriorityPayload }) => {
      const client = await createHelpdeskApiClient(CustomPrioritiesApi);
      await client.v1CustomPrioritiesIdPut(id, { id, ...payload });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [CUSTOM_PRIORITIES_QUERY_KEY],
      }),
  });
};

export const useDeleteCustomPriority = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const client = await createHelpdeskApiClient(CustomPrioritiesApi);
      await client.v1CustomPrioritiesIdDelete(id);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [CUSTOM_PRIORITIES_QUERY_KEY],
      }),
  });
};
