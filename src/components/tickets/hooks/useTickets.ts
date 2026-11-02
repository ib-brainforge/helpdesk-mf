import { toCreatedTicket } from '@/components/tickets/created-ticket';
import { SUBTASKS_ENABLED, TICKET_LINKS_ENABLED } from '@/constants/features';
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
import {
  type TicketLink,
  type TicketLinkSemantic,
  toWireLink,
} from '@/types/ticket-links';
import { toApiTicketPriority, toApiTicketStatus } from '@/utils/typeMappers';
import {
  IdeasApi,
  ProviderTenantTicketsApi,
  TicketsApi,
} from '@brainforgeau/helpdesk-client';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

/** The filters with the search box's name matches added (see useSearchMatches). */
export const withSearchMatches = (
  filters: TicketFilters,
  userIds: string[],
  scopeIds: string[],
): TicketFilters => ({
  ...filters,
  searchUserIds: userIds.length > 0 ? userIds : undefined,
  searchScopeIds: scopeIds.length > 0 ? scopeIds : undefined,
});

/**
 * The Assignee filter's selection as the ticket endpoints take it, worked out
 * once for the list, the counts and fetchTicketCount.
 *
 * One person and nothing else goes in the plain `assigneeId`, which the
 * generated client declares and the "Assigned to you" tab has always sent.
 * Anything wider (several people, or Unassigned ticked) goes out as repeated
 * `assigneeIds=` plus `includeUnassigned`, which the backend matches as "any
 * of" and the generated client predates.
 */
export const assigneeParams = (
  filters: TicketFilters,
): {
  assigneeId?: string;
  assigneeIds?: string[];
  includeUnassigned?: true;
} => {
  const people = filters.assigneeId ?? [];
  if (people.length === 1 && !filters.includeUnassigned) {
    return { assigneeId: people[0] };
  }
  return {
    assigneeIds: people.length > 0 ? people : undefined,
    includeUnassigned: filters.includeUnassigned ? true : undefined,
  };
};

/**
 * A multi-select's ids in the shape the ticket endpoints take: one id in the
 * single-valued parameter every backend version reads, several as repeated
 * `<plural>=` ("any of"), the same split as assigneeParams.
 */
export const putIds = (
  params: Record<string, unknown>,
  single: string,
  plural: string,
  ids: string[] | undefined,
) => {
  if (!ids?.length) return;
  if (ids.length === 1) params[single] = ids[0];
  else params[plural] = ids;
};

/**
 * The multi-select filters the list endpoints declare as repeated
 * `<plural>=` params ("any of"): several categories, several people or
 * Unassigned in the Assignee filter. One category or one person goes in the
 * single-valued argument every backend version reads.
 */
const multiValues = (filters: TicketFilters) => {
  const { assigneeIds, includeUnassigned } = assigneeParams(filters);
  return {
    assigneeIds,
    includeUnassigned,
    categoryIds:
      (filters.categoryId?.length ?? 0) > 1 ? filters.categoryId : undefined,
  };
};

/**
 * The filter values the ticket endpoints take, mapped once.
 *
 * The grid and the tab badges have to ask the same question or a badge stops
 * being a statement about the list it labels, so the mapping lives here instead
 * of being written out twice.
 */
const ticketQueryValues = (filters: TicketFilters) => ({
  /*
   * A single status goes in `status`; a tab that means a SET of statuses goes
   * in `statuses` (sent as repeated `statuses=` params), never both. Unclosed
   * and Unassigned are both New OR In Progress, and `status` holds one value,
   * so sending only that listed New alone: the Unassigned tab showed 161 rows
   * under a badge reading 388. `statuses` takes precedence over `status`
   * server-side.
   */
  status:
    filters.status?.length === 1
      ? toApiTicketStatus(filters.status[0])
      : undefined,
  statuses:
    (filters.status?.length ?? 0) > 1
      ? filters.status?.map(toApiTicketStatus)
      : undefined,
  // The single custom-status argument is no longer used: custom statuses go
  // out as a set (customStatusIds), so ticking several works.
  customStatusId: undefined,
  customStatusIds: filters.customStatusIds?.length
    ? filters.customStatusIds
    : undefined,
  priority: filters.priority?.[0]
    ? toApiTicketPriority(filters.priority[0])
    : undefined,
  categoryId:
    filters.categoryId?.length === 1 ? filters.categoryId[0] : undefined,
  // A wider selection goes out via extraParams (assigneeIds).
  assigneeId: assigneeParams(filters).assigneeId,
  searchTerm: filters.searchTerm,
  overdueOnly: filters.overdueOnly ? true : undefined,
  tagIds: filters.tagIds?.length ? filters.tagIds : undefined,
  // Name matches for the search box, resolved by useSearchMatches.
  searchUserIds: filters.searchUserIds?.length
    ? filters.searchUserIds
    : undefined,
  searchScopeIds: filters.searchScopeIds?.length
    ? filters.searchScopeIds
    : undefined,
});

/**
 * Positional arguments shared by GET /v1/tickets and GET
 * /v1/provider-support/tenant-tickets (the provider's "From tenants"
 * queue, which needs the provider.support permission): the same 26 filters in
 * the same order, so the list, the count and the ids all ask one question.
 */
const listArgs = (
  filters: TicketFilters,
  page?: number,
  pageSize?: number,
  sort?: string,
) => {
  const v = ticketQueryValues(filters);
  const m = multiValues(filters);
  return [
    v.status,
    v.statuses,
    v.customStatusId,
    v.priority,
    v.categoryId,
    v.assigneeId,
    undefined, // requesterId
    v.searchTerm,
    v.tagIds,
    undefined, // organisationId
    undefined, // divisionId
    undefined, // unreadOnly
    v.overdueOnly,
    undefined, // spamOnly: the default view excludes spam
    undefined, // unassignedOnly: Unassigned is includeUnassigned now
    page,
    pageSize,
    sort,
    m.assigneeIds,
    m.includeUnassigned,
    v.customStatusIds,
    m.categoryIds,
    undefined, // organisationIds
    v.searchUserIds,
    v.searchScopeIds,
  ] as const;
};

/**
 * Which rows of the one list a call asks for: the tenant's own only (what
 * bulk actions can change), the one list (own plus those raised above), or
 * the "Raised with our provider" preset (raised above only).
 */
type ListRows = 'own' | 'one-list' | 'raised-above';

const rowsFor = (filters: TicketFilters): ListRows =>
  filters.raisedAboveOnly ? 'raised-above' : 'one-list';

/** One page of the tenant's tickets, or of the provider's From tenants queue. */
const fetchTicketPage = async (
  fromTenants: boolean,
  args: ReturnType<typeof listArgs>,
  rows: ListRows,
) => {
  if (fromTenants) {
    const client = await createHelpdeskApiClient(ProviderTenantTicketsApi);
    return (await client.v1ProviderSupportTenantTicketsGet(...args)).data;
  }
  // The last two positional parameters of v1TicketsGet: left unset, the call
  // returns the tenant's own tickets only.
  const includeRaisedAbove = rows === 'own' ? undefined : true;
  const raisedAboveOnly = rows === 'raised-above' ? true : undefined;
  const client = await createHelpdeskApiClient(TicketsApi);
  return (
    await client.v1TicketsGet(...args, includeRaisedAbove, raisedAboveOnly)
  ).data;
};

/**
 * How many of the tenant's OWN tickets match `filters`: what "Select all
 * matching" can act on, the same population as fetchTicketIds. The list's
 * totalCount also counts the rows raised above the tenant, which no bulk
 * action can change.
 *
 * pageSize 1, and only `totalCount` is read off the paged envelope; the single
 * row that comes back is discarded.
 */
export const fetchOwnTicketCount = async (
  filters: TicketFilters,
  fromTenants = false,
): Promise<number> => {
  const data = await fetchTicketPage(
    fromTenants,
    listArgs(filters, 1, 1),
    'own',
  );
  return data.totalCount ?? 0;
};

export interface TicketIdRef {
  id: string;
}

export interface TicketIdsResult {
  items: TicketIdRef[];
  total: number;
  /** More matched than the endpoint returns; the rest are left out. */
  truncated: boolean;
}

/**
 * Every ticket `filters` match, as ids, for a bulk action in "all matching"
 * mode. Same filters and the same queue as the list (GET /v1/tickets/ids), so
 * the action covers exactly what the list counts.
 */
export const fetchTicketIds = async (
  filters: TicketFilters,
  fromTenants = false,
  sort?: string,
): Promise<TicketIdsResult> => {
  // Bulk actions act on the tenant's own tickets only: rows handled above it
  // live in another tenant and are never selectable, so neither
  // includeRaisedAbove nor raisedAboveOnly is sent here.
  const args = listArgs(filters, undefined, undefined, sort);
  const data = fromTenants
    ? (
        await (
          await createHelpdeskApiClient(ProviderTenantTicketsApi)
        ).v1ProviderSupportTenantTicketsIdsGet(...args)
      ).data
    : (
        await (
          await createHelpdeskApiClient(TicketsApi)
        ).v1TicketsIdsGet(...args)
      ).data;
  const items = (data?.items ?? []).flatMap(i => (i.id ? [{ id: i.id }] : []));
  return {
    items,
    total: data?.total ?? items.length,
    truncated: Boolean(data?.truncated),
  };
};

/** One page of the ticket list, filtered and sorted on the server (`sort` is `-key,key`). */
export const fetchTicketList = async ({
  filters,
  page,
  pageSize,
  sort,
  fromTenants,
}: {
  filters: TicketFilters;
  page: number;
  pageSize: number;
  sort?: string;
  fromTenants: boolean;
}): Promise<{ rows: TicketListDto[]; totalCount: number }> => {
  const result = await fetchTicketPage(
    fromTenants,
    listArgs(filters, page, pageSize, sort),
    rowsFor(filters),
  );
  return {
    // The generated rows leave the deadline instants optional; TicketListDto
    // types them as present-or-null.
    rows: (result.items ?? []) as TicketListDto[],
    totalCount: result.totalCount ?? 0,
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
      return toCreatedTicket(response.data);
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

      // Status change.
      //
      // `customStatusId` is sent on every status patch, not only when one is
      // set. The command assigns it unconditionally, so passing null is how a
      // custom status gets detached when someone picks a plain built-in status;
      // omitting the field would leave the old one attached to a ticket whose
      // system status had moved on.
      if (updates.status) {
        await client.v1TicketsIdStatusPatch(id, {
          newStatus: toApiTicketStatus(updates.status),
          customStatusId: updates.customStatusId ?? null,
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

      // Assignment change.
      //
      // Tested against undefined, not truthiness: `null` is a deliberate
      // unassign and the endpoint accepts it (AssigneeId is Guid? and the
      // domain's Assign(null) clears it). A truthy test swallowed the clear
      // silently, so the cross on the assignee picker did nothing.
      if (updates.assigneeId !== undefined) {
        await client.v1TicketsIdAssignPatch(id, {
          assigneeId: updates.assigneeId ?? null,
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
    /**
     * Takes the phrase the user picked, not a wire value. `toWireLink` turns it
     * into (source, target, type), reversing the two ids for the phrasings that
     * put the current ticket on the far end of the edge.
     *
     * This previously passed the picker's own string through `as any`, so the
     * request carried "relates-to" where the endpoint expects the enum name.
     */
    mutationFn: async ({
      currentTicketId,
      otherTicketId,
      semantic,
    }: {
      currentTicketId: string;
      otherTicketId: string;
      semantic: TicketLinkSemantic;
    }) => {
      const wire = toWireLink(semantic, currentTicketId, otherTicketId);
      const client = await createHelpdeskApiClient(TicketsApi);
      await client.v1TicketsIdLinksPost(wire.sourceTicketId, {
        targetTicketId: wire.targetTicketId,
        linkType: wire.linkType,
      });
      return {
        sourceTicketId: wire.sourceTicketId,
        targetTicketId: wire.targetTicketId,
      };
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      // Both ends of the edge: the link shows on the other ticket too.
      for (const ticketId of [data.sourceTicketId, data.targetTicketId]) {
        queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
        queryClient.invalidateQueries({ queryKey: ['ticket-links', ticketId] });
      }
    },
  });
};

/** Every link on a ticket, as source or as target. */
export const useTicketLinks = (ticketId: string) => {
  return useQuery({
    queryKey: ['ticket-links', ticketId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(TicketsApi);
      const response = await client.v1TicketsIdLinksGet(ticketId);
      return (response.data ?? []) as TicketLink[];
    },
    enabled: TICKET_LINKS_ENABLED && !!ticketId,
  });
};

export const useUnlinkTickets = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      linkId,
    }: { ticketId: string; linkId: string }) => {
      const client = await createHelpdeskApiClient(TicketsApi);
      await client.v1TicketsIdLinksLinkIdDelete(ticketId, linkId);
      return { ticketId };
    },
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: ['ticket-links', data.ticketId],
      });
      queryClient.invalidateQueries({ queryKey: ['ticket', data.ticketId] });
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

export const useTicketChildren = (ticketId: string) => {
  return useQuery({
    queryKey: ['ticket-children', ticketId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(TicketsApi);
      const response = await client.v1TicketsIdChildrenGet(ticketId, 1, 50);
      return response.data?.items ?? [];
    },
    enabled: SUBTASKS_ENABLED && !!ticketId,
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
