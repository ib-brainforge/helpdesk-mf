/**
 * Provider support: the provider's context and preset categories, and the
 * read-only projection of a ticket the tenant raised that a helpdesk above it
 * works. The server works out which office, never the request.
 */

import {
  CategoriesApi,
  ProviderSupportApi,
  TicketsApi,
} from '@/api/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const KEY = 'provider-support';

/** Whether the tenant has a provider to contact, and where its office is. */
export const useProviderSupportContext = () =>
  useQuery({
    queryKey: [KEY, 'context'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ProviderSupportApi);
      const { data } = await client.v1ProviderSupportContextGet();
      return data;
    },
  });

/** The categories the provider's office offers for a request. */
export const useProviderCategories = (enabled = true) =>
  useQuery({
    enabled,
    queryKey: [KEY, 'categories'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ProviderSupportApi);
      const { data } = await client.v1ProviderSupportCategoriesGet();
      return [...(data ?? [])].sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          (a.name ?? '').localeCompare(b.name ?? ''),
      );
    },
  });

/**
 * Every preset category of the provider's office, in order: its current default
 * assignee and its open and overdue tickets in the tenants and with the Provider.
 */
export const useProviderCategoryOpenCounts = () =>
  useQuery({
    queryKey: [KEY, 'category-open-counts'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ProviderSupportApi);
      const { data } = await client.v1ProviderSupportCategoryOpenCountsGet();
      return data ?? [];
    },
  });

/** Sets (or, with null, clears) who tickets in a preset category are assigned to by default. */
export const useSetCategoryDefaultAssignee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      categoryId,
      assigneeId,
    }: { categoryId: string; assigneeId: string | null }) => {
      const client = await createHelpdeskApiClient(CategoriesApi);
      await client.v1CategoriesIdDefaultAssigneePut(categoryId, { assigneeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [KEY, 'category-open-counts'],
      });
    },
  });
};

/**
 * Keyed under ['ticket', id] so the realtime handlers (useRealtimeComments,
 * useRealtimeTickets), which invalidate that prefix, refresh the projection
 * of a ticket handled above the tenant as well.
 */
const raisedTicketKey = (id: string | undefined) => ['ticket', id, 'raised'];

/** One ticket the tenant raised with a helpdesk above it. */
export const useRaisedTicket = (id: string | undefined) =>
  useQuery({
    enabled: !!id,
    queryKey: raisedTicketKey(id),
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ProviderSupportApi);
      const { data } = await client.v1ProviderSupportTicketsIdGet(id as string);
      return data;
    },
  });

/** The public replies on a ticket the tenant raised. */
export const useRaisedTicketComments = (id: string | undefined) =>
  useQuery({
    enabled: !!id,
    queryKey: [...raisedTicketKey(id), 'comments'],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ProviderSupportApi);
      const { data } = await client.v1ProviderSupportTicketsIdCommentsGet(
        id as string,
        1,
        100,
      );
      return data.items ?? [];
    },
  });

/**
 * The requester's public reply on a ticket a helpdesk above the tenant works
 * (`POST v1/provider-support/tickets/{id}/comments`).
 */
export const useReplyOnRaisedTicket = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      body,
      idempotencyKey,
    }: { body: string; idempotencyKey: string }) => {
      const client = await createHelpdeskApiClient(ProviderSupportApi);
      const { data } = await client.v1ProviderSupportTicketsIdCommentsPost(id, {
        body,
        idempotencyKey,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: raisedTicketKey(id) });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

/**
 * Moves one of the tenant's tickets to its provider's office ("From
 * tenants" there). The ticket keeps its history and submitter and leaves
 * this tenant's list.
 */
export const useForwardTicketToProvider = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticketId,
      categoryId,
    }: { ticketId: string; categoryId?: string }) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      await client.v1TicketsIdForwardToProviderPost(ticketId, { categoryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket'] });
      queryClient.invalidateQueries({ queryKey: [KEY, 'tickets'] });
    },
  });
};
