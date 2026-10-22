import {
  CannedResponsesApi,
  type HelpdeskApplicationCannedResponsesCommandsCreateCannedResponseCreateCannedResponseCommand,
  type HelpdeskApplicationCannedResponsesCommandsUpdateCannedResponseUpdateCannedResponseCommand,
} from '@/api/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CannedResponseDto } from '@/types/canned-response';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const useCannedResponses = (
  categoryId?: string,
  searchTerm?: string,
) => {
  const { data, isLoading, refetch } = useQuery<CannedResponseDto[]>({
    queryKey: ['helpdesk-canned-responses', categoryId, searchTerm],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(CannedResponsesApi);
      const response = await client.v1CannedResponsesGet(
        categoryId,
        searchTerm,
      );
      return response.data ?? [];
    },
  });

  return {
    cannedResponses: data ?? [],
    isLoading,
    refetch,
  };
};

export const useCreateCannedResponse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      command: HelpdeskApplicationCannedResponsesCommandsCreateCannedResponseCreateCannedResponseCommand,
    ) => {
      const client = await createHelpdeskApiClient(CannedResponsesApi);
      const response = await client.v1CannedResponsesPost(command);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['helpdesk-canned-responses'],
      });
    },
  });
};

export const useUpdateCannedResponse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: HelpdeskApplicationCannedResponsesCommandsUpdateCannedResponseUpdateCannedResponseCommand;
    }) => {
      const client = await createHelpdeskApiClient(CannedResponsesApi);
      const response = await client.v1CannedResponsesIdPut(id, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['helpdesk-canned-responses'],
      });
    },
  });
};

export const useDeleteCannedResponse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = await createHelpdeskApiClient(CannedResponsesApi);
      await client.v1CannedResponsesIdDelete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['helpdesk-canned-responses'],
      });
    },
  });
};
