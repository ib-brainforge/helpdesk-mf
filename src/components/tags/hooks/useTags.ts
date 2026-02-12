import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TagsApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { TagDto, CreateTagDto } from '@/types';

export const useTags = (searchTerm?: string) => {
  const { data, isLoading, refetch } = useQuery<TagDto[]>({
    queryKey: ['tags', searchTerm],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(TagsApi);

      // REVIEW: Using search endpoint for autocomplete functionality
      const response = await client.v1TagsSearchGet(searchTerm);
      return (response.data ?? []) as unknown as TagDto[];
    },
  });

  return {
    tags: data ?? [],
    isLoading,
    refetch,
  };
};

export const useTicketTags = (ticketId: string) => {
  const { data, isLoading, refetch } = useQuery<TagDto[]>({
    queryKey: ['ticket-tags', ticketId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(TagsApi);
      const response = await client.v1TagsTicketTicketIdGet(ticketId);
      return (response.data ?? []) as unknown as TagDto[];
    },
    enabled: Boolean(ticketId),
  });

  return {
    tags: data ?? [],
    isLoading,
    refetch,
  };
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tag: CreateTagDto) => {
      const client = await createHelpdeskApiClient(TagsApi);
      const response = await client.v1TagsPost({
        name: tag.name,
        color: tag.color,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
};

export const useAddTagToTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, tagId }: { ticketId: string; tagId: string }) => {
      const client = await createHelpdeskApiClient(TagsApi);

      // REVIEW: Backend endpoint adds tag by tagId (must exist first)
      const response = await client.v1TagsTicketIdTagsTagIdPost(ticketId, tagId);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-tags', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
};

export const useRemoveTagFromTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, tagId }: { ticketId: string; tagId: string }) => {
      const client = await createHelpdeskApiClient(TagsApi);
      await client.v1TagsTicketIdTagsTagIdDelete(ticketId, tagId);
      return { ticketId, tagId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-tags', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
};
