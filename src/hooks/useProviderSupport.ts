/**
 * Provider support: the calls behind "Contact your provider" and "Raised with
 * our provider". The ticket is created in, and looked up from, the office of
 * the caller's provider; the server works that out, never the request.
 */

import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  CategoriesApi,
  ProviderSupportApi,
  type HelpdeskApplicationProviderSupportCommandsRaiseTicketWithProviderRaiseTicketWithProviderCommand as RaiseTicketCommand,
  TicketsApi,
} from '@brainforgeau/helpdesk-client';
import type { HelpdeskDomainTicketsEnumsTicketStatus } from '@brainforgeau/helpdesk-client';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useState } from 'react';

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

/** Raises a ticket with the provider; resolves to the new ticket's id. */
export const useRaiseTicketWithProvider = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (command: RaiseTicketCommand) => {
      const client = await createHelpdeskApiClient(ProviderSupportApi);
      const { data } = await client.v1ProviderSupportTicketsPost(command);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'tickets'] });
    },
  });
};

const PAGE_SIZE = 25;

/** What this tenant has raised with its provider (read only). */
export const useRaisedWithProvider = (
  status?: HelpdeskDomainTicketsEnumsTicketStatus,
) => {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: [KEY, 'tickets', status ?? null, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ProviderSupportApi);
      const { data } = await client.v1ProviderSupportTicketsGet(
        status,
        page,
        PAGE_SIZE,
      );
      return data;
    },
  });
  return { ...query, page, setPage, pageSize: PAGE_SIZE };
};

/** One ticket the tenant raised with its provider. */
export const useRaisedTicket = (id: string | undefined) =>
  useQuery({
    enabled: !!id,
    queryKey: [KEY, 'ticket', id],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ProviderSupportApi);
      const { data } = await client.v1ProviderSupportTicketsIdGet(id as string);
      return data;
    },
  });

/** The provider's public replies on a ticket the tenant raised. */
export const useRaisedTicketComments = (id: string | undefined) =>
  useQuery({
    enabled: !!id,
    queryKey: [KEY, 'ticket', id, 'comments'],
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
