import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CannedResponsesApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CannedResponseDto } from '@/types/canned-response';

export const useCannedResponses = (categoryId?: string, searchTerm?: string) => {
  const { data, isLoading, refetch } = useQuery<CannedResponseDto[]>({
    queryKey: ['helpdesk-canned-responses', categoryId, searchTerm],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(CannedResponsesApi);
      const response = await client.v1CannedResponsesGet(categoryId, searchTerm);
      return (response.data ?? []) as CannedResponseDto[];
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
    mutationFn: async (cannedResponse: {
      title: string;
      body: string;
      categoryId?: string;
      scope?: string;
    }) => {
      const client = await createHelpdeskApiClient(CannedResponsesApi);
      const response = await client.v1CannedResponsesPost({
        title: cannedResponse.title,
        body: cannedResponse.body,
        categoryId: cannedResponse.categoryId,
        scope: cannedResponse.scope as any,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-canned-responses'] });
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
      updates: {
        title?: string;
        body?: string;
        categoryId?: string;
        scope?: string;
      };
    }) => {
      const client = await createHelpdeskApiClient(CannedResponsesApi);
      const response = await client.v1CannedResponsesIdPut(id, {
        title: updates.title,
        body: updates.body,
        categoryId: updates.categoryId,
        scope: updates.scope as any,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-canned-responses'] });
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
      queryClient.invalidateQueries({ queryKey: ['helpdesk-canned-responses'] });
    },
  });
};
