import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type {
  CreateTicketDto,
  PagedResult,
  TicketDto,
  TicketFilters,
  TicketListDto,
  TicketPriority,
  TicketStatus,
  UpdateTicketDto,
} from '@/types/ticket';
import { toApiTicketPriority, toApiTicketStatus } from '@/utils/typeMappers';
import { IdeasApi, TicketsApi } from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import { useCallback, useState } from 'react';

export const useTicketsData = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [filters, setFilters] = useState<TicketFilters>({});

  const { data, isLoading, refetch } = useQuery<PagedResult<TicketListDto>>({
    queryKey: ['tickets', pagination, filters],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(TicketsApi);
      const response = await client.v1TicketsGet(
        filters.status?.[0] ? toApiTicketStatus(filters.status[0]) : undefined,
        filters.customStatusId, // customStatusId — tenant-defined custom status
        filters.priority?.[0]
          ? toApiTicketPriority(filters.priority[0])
          : undefined,
        filters.categoryId?.[0],
        // When unassignedOnly is active, clear assigneeId so the backend filter is not confused.
        filters.unassignedOnly ? undefined : filters.assigneeId?.[0],
        undefined, // requesterId
        filters.searchTerm,
        undefined, // unreadOnly
        filters.overdueOnly ? true : undefined, // overdueOnly — tickets past their due date
        undefined, // spamOnly — default view excludes spam
        filters.unassignedOnly ? true : undefined, // unassignedOnly — typed param
        pagination.pageIndex + 1,
        pagination.pageSize,
        undefined, // sortBy
        undefined, // sortDirection
        /*
         * Tag filter, sent through the raw axios config rather than as a named
         * argument. The backend now accepts `tagIds` (see GetTicketsQuery), but
         * @brainforgeau/helpdesk-client is generated from the OpenAPI spec by
         * CI, so the generated `v1TicketsGet` signature will not carry the
         * parameter until generate-client.yml runs against the merged backend
         * change. Until then this appends it to the same request.
         *
         * `indexes: null` makes axios emit `tagIds=a&tagIds=b` rather than its
         * default `tagIds[]=a`, which is the form ASP.NET Core model binding
         * expects for a `Guid[]` query parameter.
         *
         * REPLACE WITH the generated named argument once the client is
         * regenerated, and drop this options object.
         */
        filters.tagIds?.length
          ? {
              params: { tagIds: filters.tagIds },
              paramsSerializer: { indexes: null },
            }
          : undefined,
      );

      const result = response.data;
      return {
        items: result.items ?? [],
        totalCount: result.totalCount ?? 0,
        page: result.page ?? 1,
        pageSize: result.pageSize ?? pagination.pageSize,
      };
    },
  });

  return {
    items: data?.items ?? [],
    totalCount: data?.totalCount ?? 0,
    pagination,
    setPagination,
    filters,
    setFilters,
    isLoading,
    refetch: useCallback(() => {
      refetch();
    }, [refetch]),
  };
};

export const useTicketDetail = (ticketId: string) => {
  const { data, isLoading, error } = useQuery<TicketDto>({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(TicketsApi);
      const response = await client.v1TicketsIdGet(ticketId);
      return response.data as TicketDto;
    },
    enabled: !!ticketId,
  });

  return { data, isLoading, error };
};

export const useCreateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticket: CreateTicketDto) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      const response = await client.v1TicketsPost({
        subject: ticket.subject,
        description: ticket.description,
        priority: toApiTicketPriority(ticket.priority),
        categoryId: ticket.categoryId,
        assigneeId: ticket.assigneeId,
        tags: ticket.tags,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

export const useUpdateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: { id: string; updates: UpdateTicketDto }) => {
      const client = await createHelpdeskApiClient(TicketsApi);

      // REVIEW: Backend has separate endpoints for different updates
      // Basic fields (subject, description)
      if (updates.subject || updates.description) {
        await client.v1TicketsIdPut(id, {
          subject: updates.subject,
          description: updates.description,
        });
      }

      // Status change
      if (updates.status) {
        await client.v1TicketsIdStatusPatch(id, {
          newStatus: toApiTicketStatus(updates.status),
        });
      }

      // Priority change
      if (updates.priority) {
        await client.v1TicketsIdPriorityPatch(id, {
          newPriority: toApiTicketPriority(updates.priority),
        });
      }

      // Category change
      if (updates.categoryId) {
        await client.v1TicketsIdCategoryPatch(id, {
          newCategoryId: updates.categoryId,
        });
      }

      // Assignment change
      if (updates.assigneeId) {
        await client.v1TicketsIdAssignPatch(id, {
          assigneeId: updates.assigneeId,
        });
      }

      return { id, ...updates };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] });
    },
  });
};

export const useBulkUpdateTickets = () => {
  const queryClient = useQueryClient();

  // REVIEW: Using simple loop for bulk updates - backend doesn't have dedicated bulk endpoint
  return useMutation({
    mutationFn: async ({
      ids,
      updates,
    }: { ids: string[]; updates: UpdateTicketDto }) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      const promises = ids.map(async id => {
        // Basic fields
        if (updates.subject || updates.description) {
          await client.v1TicketsIdPut(id, {
            subject: updates.subject,
            description: updates.description,
          });
        }

        // Status change
        if (updates.status) {
          await client.v1TicketsIdStatusPatch(id, {
            newStatus: toApiTicketStatus(updates.status),
          });
        }

        // Priority change
        if (updates.priority) {
          await client.v1TicketsIdPriorityPatch(id, {
            newPriority: toApiTicketPriority(updates.priority),
          });
        }

        // Category change
        if (updates.categoryId) {
          await client.v1TicketsIdCategoryPatch(id, {
            newCategoryId: updates.categoryId,
          });
        }

        // Assignment change
        if (updates.assigneeId !== undefined) {
          await client.v1TicketsIdAssignPatch(id, {
            assigneeId: updates.assigneeId,
          });
        }
      });
      await Promise.all(promises);
      return { ids, updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

export const useBulkDeleteTickets = () => {
  const queryClient = useQueryClient();

  // REVIEW: Using simple loop for bulk delete - backend doesn't have dedicated bulk endpoint
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      const promises = ids.map(async id => {
        await client.v1TicketsIdDelete(id);
      });
      await Promise.all(promises);
      return ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

export const useMergeTickets = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      primaryTicketId,
      ticketIdToMerge,
    }: { primaryTicketId: string; ticketIdToMerge: string }) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      await client.v1TicketsIdMergePost(primaryTicketId, {
        mergedTicketId: ticketIdToMerge,
      });
      return { primaryTicketId, ticketIdToMerge };
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({
        queryKey: ['ticket', data.primaryTicketId],
      });
      queryClient.invalidateQueries({
        queryKey: ['ticket', data.ticketIdToMerge],
      });
    },
  });
};

export const useLinkTickets = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceTicketId,
      targetTicketId,
      linkType,
    }: {
      sourceTicketId: string;
      targetTicketId: string;
      linkType: string;
    }) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      // REVIEW: Using linkType as any to bypass enum type check - backend should accept string linkType
      await client.v1TicketsIdLinksPost(sourceTicketId, {
        targetTicketId,
        linkType: linkType as any,
      });
      return { sourceTicketId, targetTicketId };
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({
        queryKey: ['ticket', data.sourceTicketId],
      });
      queryClient.invalidateQueries({
        queryKey: ['ticket', data.targetTicketId],
      });
    },
  });
};

export const useDeleteTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      await client.v1TicketsIdDelete(ticketId);
      return ticketId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

export const useMyTicketSubscription = (ticketId: string) => {
  return useQuery<boolean>({
    queryKey: ['ticket-subscription', ticketId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(TicketsApi);
      const response = await client.v1TicketsIdSubscribeMeGet(ticketId);
      return response.data as boolean;
    },
    enabled: !!ticketId,
  });
};

export const useSubscribeToTicket = (ticketId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const client = await createHelpdeskApiClient(TicketsApi);
      await client.v1TicketsIdSubscribePost(ticketId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ticket-subscription', ticketId],
      });
    },
  });
};

export const useUnsubscribeFromTicket = (ticketId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const client = await createHelpdeskApiClient(TicketsApi);
      await client.v1TicketsIdSubscribeDelete(ticketId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ticket-subscription', ticketId],
      });
    },
  });
};

export const useMarkTicketAsSpam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      await client.v1TicketsIdMarkSpamPost(ticketId);
      return ticketId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

export const useUnmarkTicketAsSpam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      await client.v1TicketsIdUnmarkSpamPost(ticketId);
      return ticketId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

// Wave 3 hooks

export const useForwardTicket = () => {
  return useMutation({
    mutationFn: async ({
      ticketId,
      to,
      cc,
      subject,
      body,
      includeAttachments,
    }: {
      ticketId: string;
      to: string[];
      cc?: string[];
      subject: string;
      body: string;
      includeAttachments: boolean;
    }) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      await client.v1TicketsIdForwardPost(ticketId, {
        to,
        cc: cc ?? null,
        subject,
        body,
        includeAttachments,
      });
    },
  });
};

export const useDuplicateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      const response = await client.v1TicketsIdDuplicatePost(ticketId);
      return response.data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

export const useConvertToReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      parentTicketId,
    }: { ticketId: string; parentTicketId: string }) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      await client.v1TicketsIdConvertToReplyPost(ticketId, { parentTicketId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

export const useSetTicketParent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      parentTicketId,
    }: { ticketId: string; parentTicketId: string }) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      await client.v1TicketsIdParentPut(ticketId, { parentTicketId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['ticket', variables.ticketId],
      });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

export const useClearTicketParent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      await client.v1TicketsIdParentDelete(ticketId);
    },
    onSuccess: (_, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    },
  });
};

export const useTicketChildren = (ticketId: string) => {
  return useQuery({
    queryKey: ['ticket-children', ticketId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(TicketsApi);
      const response = await client.v1TicketsIdChildrenGet(ticketId, 1, 50);
      return response.data?.items ?? [];
    },
    enabled: !!ticketId,
  });
};

export const useLinkedAssets = (ticketId: string) => {
  return useQuery({
    queryKey: ['ticket-linked-assets', ticketId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(TicketsApi);
      const response = await client.v1TicketsIdLinkedAssetsGet(ticketId);
      return response.data ?? [];
    },
    enabled: !!ticketId,
  });
};

export const useLinkAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      assetId,
    }: { ticketId: string; assetId: string }) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      const response = await client.v1TicketsIdLinkedAssetsPost(ticketId, {
        assetId,
      });
      return response.data as string;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['ticket-linked-assets', variables.ticketId],
      });
    },
  });
};

export const useUnlinkAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      assetId,
    }: { ticketId: string; assetId: string }) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      await client.v1TicketsIdLinkedAssetsAssetIdDelete(ticketId, assetId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['ticket-linked-assets', variables.ticketId],
      });
    },
  });
};

// ── Wave 6 hooks ─────────────────────────────────────────────────────────────

export type CreateSubtaskDto = {
  subject: string;
  description?: string;
  assigneeId?: string;
  priority?: number;
  categoryId?: string;
};

export const useCreateSubtask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parentTicketId,
      data,
    }: { parentTicketId: string; data: CreateSubtaskDto }) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      const response = await client.v1TicketsParentIdSubtasksPost(
        parentTicketId,
        data as never,
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['ticket', variables.parentTicketId],
      });
      queryClient.invalidateQueries({
        queryKey: ['ticket-children', variables.parentTicketId],
      });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

export const useMarkTicketAsProblem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      await client.v1TicketsIdMarkProblemPost(ticketId);
      return ticketId;
    },
    onSuccess: ticketId => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    },
  });
};

export const useUnmarkTicketAsProblem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      await client.v1TicketsIdUnmarkProblemPost(ticketId);
      return ticketId;
    },
    onSuccess: ticketId => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    },
  });
};

export const usePublishTicketAsIdea = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      await client.v1TicketsIdPublishAsIdeaPost(ticketId);
      return ticketId;
    },
    onSuccess: ticketId => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    },
  });
};

export const useUnpublishTicketAsIdea = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      await client.v1TicketsIdUnpublishAsIdeaPost(ticketId);
      return ticketId;
    },
    onSuccess: ticketId => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    },
  });
};

export type IdeaListItem = {
  id: string;
  subject: string;
  description?: string;
  requesterId: string;
  submitterEmail: string;
  publishedAt: string;
  voteCount: number;
  createdAt: string;
};

export const useIdeasForum = (page = 1, pageSize = 20) => {
  return useQuery<{
    items: IdeaListItem[];
    totalCount: number;
    page: number;
    pageSize: number;
  }>({
    queryKey: ['ideas', page, pageSize],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(IdeasApi);
      const response = await client.v1IdeasGet(page, pageSize);
      return response.data as {
        items: IdeaListItem[];
        totalCount: number;
        page: number;
        pageSize: number;
      };
    },
  });
};
