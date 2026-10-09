import { helpdeskScopeKey, useHelpdeskScope } from '@/hooks/useHelpdeskScope';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CreateTagDto, TagDto } from '@/types';
import { TagsApi } from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * The company's tags. `enabled: false` holds the request until it is wanted
 * (the Tickets list asks only once its Tags filter is opened); the key is the
 * same either way, so the list is cached for every later caller.
 */
export const useTags = (
  searchTerm?: string,
  { enabled = true }: { enabled?: boolean } = {},
) => {
  const scope = useHelpdeskScope();
  const { data, isLoading, refetch } = useQuery<TagDto[]>({
    enabled,
    // Tags belong to a company, so the list is per company.
    queryKey: ['tags', helpdeskScopeKey(scope), searchTerm],
    // Reference data; creating a tag invalidates it.
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const client = await createHelpdeskApiClient(TagsApi, scope);

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
  const scope = useHelpdeskScope();
  const { data, isLoading, refetch } = useQuery<TagDto[]>({
    queryKey: ['ticket-tags', ticketId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(TagsApi, scope);
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
  const scope = useHelpdeskScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tag: CreateTagDto) => {
      const client = await createHelpdeskApiClient(TagsApi, scope);
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
  const scope = useHelpdeskScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      tagId,
    }: { ticketId: string; tagId: string }) => {
      const client = await createHelpdeskApiClient(TagsApi, scope);

      // REVIEW: Backend endpoint adds tag by tagId (must exist first)
      const response = await client.v1TagsTicketIdTagsTagIdPost(
        ticketId,
        tagId,
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['ticket-tags', variables.ticketId],
      });
      queryClient.invalidateQueries({
        queryKey: ['ticket', variables.ticketId],
      });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
};

export const useRemoveTagFromTicket = () => {
  const scope = useHelpdeskScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      tagId,
    }: { ticketId: string; tagId: string }) => {
      const client = await createHelpdeskApiClient(TagsApi, scope);
      await client.v1TagsTicketIdTagsTagIdDelete(ticketId, tagId);
      return { ticketId, tagId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['ticket-tags', variables.ticketId],
      });
      queryClient.invalidateQueries({
        queryKey: ['ticket', variables.ticketId],
      });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
};
