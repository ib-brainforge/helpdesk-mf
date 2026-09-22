import { useHelpdeskAccess } from '@/hooks/useHelpdeskAccess';
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
  PrincipalTicketsApi,
  TicketsApi,
} from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import { useCallback, useState } from 'react';

/**
 * @param initialFilters Applied on the FIRST render only.
 *
 * Exists so the caller can seed the tab's filters before the first fetch. The
 * tickets page reads its tab from the URL, and starting at `{}` meant the very
 * first request always asked for every ticket regardless of which tab was
 * selected, then corrected itself. That was both a wasted round trip and, until
 * the correction landed, a list that disagreed with its own highlighted tab.
 */
/**
 * Extra query parameters the generated client does not declare yet.
 *
 * The backend accepts tenantId, organisationId, divisionId and tagIds (see
 * GetTicketsQuery), but @brainforgeau/helpdesk-client is generated from the
 * OpenAPI spec by CI, so the signatures will not carry them until
 * generate-client.yml runs against the merged backend change.
 *
 * `indexes: null` makes axios emit `tagIds=a&tagIds=b` rather than its default
 * `tagIds[]=a`, which is the form ASP.NET Core model binding expects for a
 * Guid[] query parameter.
 *
 * REPLACE WITH the generated named arguments once the client is regenerated,
 * and drop this helper.
 */
const extraParams = (filters: TicketFilters, includeScope: boolean) => {
  const params: Record<string, unknown> = {};
  if (filters.tagIds?.length) params.tagIds = filters.tagIds;
  /*
   * A tab that means a SET of statuses, sent as repeated `statuses=` params.
   *
   * The single `status` argument the generated client declares holds one value,
   * so Unclosed and Unassigned (both New OR In Progress) used to send only the
   * first and silently listed New alone: the Unassigned tab showed 161 rows
   * under a badge reading 388. `statuses` is the backend's set form and takes
   * precedence over `status` there, so only one of the two is ever sent.
   */
  if ((filters.status?.length ?? 0) > 1) {
    params.statuses = filters.status?.map(toApiTicketStatus);
  }
  if (includeScope) {
    if (filters.tenantId) params.tenantId = filters.tenantId;
    if (filters.organisationId) params.organisationId = filters.organisationId;
    if (filters.divisionId) params.divisionId = filters.divisionId;
  }
  return Object.keys(params).length > 0
    ? { params, paramsSerializer: { indexes: null as null } }
    : undefined;
};

/**
 * The scalar filter values both ticket endpoints take, mapped once.
 *
 * The grid and the tab badges have to ask the same question or a badge stops
 * being a statement about the list it labels, so the mapping lives here instead
 * of being written out twice. The two endpoints still take these positionally
 * and their signatures differ (the principal one has no spamOnly), so the calls
 * themselves stay separate below.
 */
const ticketQueryValues = (filters: TicketFilters) => ({
  // Exactly one status goes in the declared `status` argument; a set goes out
  // as repeated `statuses=` via extraParams instead, never both.
  status:
    filters.status?.length === 1
      ? toApiTicketStatus(filters.status[0])
      : undefined,
  // Tenant-defined custom status.
  customStatusId: filters.customStatusId,
  priority: filters.priority?.[0]
    ? toApiTicketPriority(filters.priority[0])
    : undefined,
  categoryId: filters.categoryId?.[0],
  // When unassignedOnly is active, clear assigneeId so the backend is not asked
  // for both at once, which matches nothing.
  assigneeId: filters.unassignedOnly ? undefined : filters.assigneeId?.[0],
  searchTerm: filters.searchTerm,
  overdueOnly: filters.overdueOnly ? true : undefined,
  unassignedOnly: filters.unassignedOnly ? true : undefined,
});

/**
 * How many tickets match `filters`, without fetching them.
 *
 * pageSize 1, and only `totalCount` is read off the paged envelope; the single
 * row that comes back is discarded.
 *
 * WHY IT TAKES principalId
 * It must follow the same endpoint branch as useTicketsData. /v1/tickets
 * hardcodes `TicketScope.Tenant`, so counting there while the grid reads the
 * principal endpoint counted a different population entirely: an unfiltered
 * All tab showed 2002 rows under a badge reading 1505.
 */
export const fetchTicketCount = async (
  filters: TicketFilters,
  principalId?: string,
): Promise<number> => {
  const v = ticketQueryValues(filters);

  if (principalId) {
    const principalClient = await createHelpdeskApiClient(PrincipalTicketsApi);
    const { data } = await principalClient.v1PrincipalsPrincipalIdTicketsGet(
      principalId,
      v.status,
      v.customStatusId,
      v.priority,
      v.categoryId,
      v.assigneeId,
      undefined, // requesterId
      v.searchTerm,
      undefined, // unreadOnly
      v.overdueOnly,
      v.unassignedOnly,
      1, // page
      1, // pageSize
      undefined, // sortBy
      undefined, // sortDirection
      extraParams(filters, true),
    );
    return data.totalCount ?? 0;
  }

  const client = await createHelpdeskApiClient(TicketsApi);
  const { data } = await client.v1TicketsGet(
    v.status,
    v.customStatusId,
    v.priority,
    v.categoryId,
    v.assigneeId,
    undefined, // requesterId
    v.searchTerm,
    undefined, // unreadOnly
    v.overdueOnly,
    undefined, // spamOnly
    v.unassignedOnly,
    1, // page
    1, // pageSize
    undefined, // sortBy
    undefined, // sortDirection
    extraParams(filters, false),
  );
  return data.totalCount ?? 0;
};

export const useTicketsData = (initialFilters?: TicketFilters) => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  // Lazy initialiser: `initialFilters` is a seed, not a controlled value, so
  // later renders must not reset what the user has since changed.
  const [filters, setFilters] = useState<TicketFilters>(
    () => initialFilters ?? {},
  );

  /*
   * WHICH ENDPOINT, AND WHY IT IS DECIDED HERE
   *
   * /v1/tickets hardcodes `TicketScope.Tenant(tenantId)`, so it can only ever
   * return one tenant's rows. A Netcorp service admin is supposed to see every
   * tenant under the principal, which is what /v1/principals/{id}/tickets
   * returns (`TicketScope.Principal`). Same query, same handler, same DTO
   * server-side; the controllers differ only in the scope they set.
   *
   * Branching inside this hook rather than in the page keeps TicketGrid
   * unaware of it: one grid, one set of filters, one page, and the role
   * decides how wide the result is. The principal id comes from the context
   * token, so nothing needs it in the URL.
   *
   * The backend re-checks the role on every request, so this only decides what
   * to ask for, never what is allowed.
   */
  const { isServiceAdmin, principalId } = useHelpdeskAccess();
  const usePrincipalScope = isServiceAdmin && Boolean(principalId);

  const { data, isLoading, refetch } = useQuery<PagedResult<TicketListDto>>({
    queryKey: ['tickets', pagination, filters, principalId ?? 'tenant'],
    queryFn: async () => {
      // The same mapping fetchTicketCount uses. Written once so the rows and
      // the badge above them cannot ask different questions.
      const v = ticketQueryValues(filters);

      if (usePrincipalScope) {
        const principalClient =
          await createHelpdeskApiClient(PrincipalTicketsApi);
        const principalResponse =
          await principalClient.v1PrincipalsPrincipalIdTicketsGet(
            principalId as string,
            v.status,
            v.customStatusId,
            v.priority,
            v.categoryId,
            v.assigneeId,
            undefined, // requesterId
            v.searchTerm,
            undefined, // unreadOnly
            v.overdueOnly,
            v.unassignedOnly,
            pagination.pageIndex + 1,
            pagination.pageSize,
            undefined, // sortBy
            undefined, // sortDirection
            extraParams(filters, true),
          );
        const principalResult = principalResponse.data;
        return {
          items: principalResult.items ?? [],
          totalCount: principalResult.totalCount ?? 0,
          page: principalResult.page ?? 1,
          pageSize: principalResult.pageSize ?? pagination.pageSize,
        };
      }

      const client = await createHelpdeskApiClient(TicketsApi);
      const response = await client.v1TicketsGet(
        v.status,
        v.customStatusId,
        v.priority,
        v.categoryId,
        v.assigneeId,
        undefined, // requesterId
        v.searchTerm,
        undefined, // unreadOnly
        v.overdueOnly,
        undefined, // spamOnly — default view excludes spam
        v.unassignedOnly,
        pagination.pageIndex + 1,
        pagination.pageSize,
        undefined, // sortBy
        undefined, // sortDirection
        extraParams(filters, false),
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

        // Status change. Same contract as the single-ticket path: the custom
        // id is always sent, so null detaches one from every selected ticket
        // that had it.
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

        // Assignment change. Same null-vs-undefined contract as the
        // single-ticket path, so a bulk unassign reaches the API.
        if (updates.assigneeId !== undefined) {
          await client.v1TicketsIdAssignPatch(id, {
            assigneeId: updates.assigneeId ?? null,
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
    enabled: !!ticketId,
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
