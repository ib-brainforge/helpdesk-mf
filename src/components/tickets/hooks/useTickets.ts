import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { TicketsApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type {
  TicketListDto,
  TicketDto,
  PagedResult,
  TicketFilters,
  CreateTicketDto,
  UpdateTicketDto,
  TicketStatus,
  TicketPriority,
} from '@/types/ticket';
import { toApiTicketStatus, toApiTicketPriority } from '@/utils/typeMappers';

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
        filters.priority?.[0] ? toApiTicketPriority(filters.priority[0]) : undefined,
        filters.categoryId?.[0],
        filters.assigneeId?.[0],
        undefined, // requesterId
        filters.searchTerm,
        undefined, // unreadOnly
        pagination.pageIndex + 1,
        pagination.pageSize,
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
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateTicketDto }) => {
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
        await client.v1TicketsIdStatusPatch(id, { newStatus: toApiTicketStatus(updates.status) });
      }

      // Priority change
      if (updates.priority) {
        await client.v1TicketsIdPriorityPatch(id, { newPriority: toApiTicketPriority(updates.priority) });
      }

      // Category change
      if (updates.categoryId) {
        await client.v1TicketsIdCategoryPatch(id, { newCategoryId: updates.categoryId });
      }

      // Assignment change
      if (updates.assigneeId) {
        await client.v1TicketsIdAssignPatch(id, { assigneeId: updates.assigneeId });
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
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: UpdateTicketDto }) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      const promises = ids.map(async (id) => {
        // Basic fields
        if (updates.subject || updates.description) {
          await client.v1TicketsIdPut(id, {
            subject: updates.subject,
            description: updates.description,
          });
        }

        // Status change
        if (updates.status) {
          await client.v1TicketsIdStatusPatch(id, { newStatus: toApiTicketStatus(updates.status) });
        }

        // Priority change
        if (updates.priority) {
          await client.v1TicketsIdPriorityPatch(id, { newPriority: toApiTicketPriority(updates.priority) });
        }

        // Category change
        if (updates.categoryId) {
          await client.v1TicketsIdCategoryPatch(id, { newCategoryId: updates.categoryId });
        }

        // Assignment change
        if (updates.assigneeId) {
          await client.v1TicketsIdAssignPatch(id, { assigneeId: updates.assigneeId });
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
