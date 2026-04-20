/**
 * usePrincipalAutomation — CRUD hooks for principal-scoped automation rules.
 * Wraps PrincipalAutomationApi from the generated client.
 * Supports pagination (API has Page/PageSize params).
 */

import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  type HelpdeskApplicationAutomationCommandsCreateRuleCreatePrincipalAutomationRuleCommand,
  type HelpdeskApplicationAutomationCommandsUpdateRuleUpdatePrincipalAutomationRuleCommand,
  type HelpdeskDomainAutomationEnumsAutomationTriggerType,
  PrincipalAutomationApi,
} from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import { useState } from 'react';

const QUERY_KEY = 'principal-automation-rules';

export interface PrincipalAutomationFilters {
  triggerType?: HelpdeskDomainAutomationEnumsAutomationTriggerType;
  isEnabled?: boolean;
}

export function usePrincipalAutomation(
  principalId: string,
  filters?: PrincipalAutomationFilters,
) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const query = useQuery({
    queryKey: [QUERY_KEY, principalId, pagination, filters],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(PrincipalAutomationApi);
      const response = await client.v1PrincipalsPrincipalIdAutomationRulesGet(
        principalId,
        filters?.triggerType,
        filters?.isEnabled,
        pagination.pageIndex + 1,
        pagination.pageSize,
      );
      return response.data;
    },
    enabled: Boolean(principalId),
  });

  return {
    ...query,
    items: query.data?.items ?? [],
    totalCount: query.data?.totalCount ?? 0,
    pagination,
    setPagination,
  };
}

export function usePrincipalAutomationRule(principalId: string, id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, principalId, id],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(PrincipalAutomationApi);
      const response = await client.v1PrincipalsPrincipalIdAutomationRulesIdGet(
        principalId,
        id,
      );
      return response.data;
    },
    enabled: Boolean(principalId) && Boolean(id),
  });
}

export function useCreatePrincipalAutomationRule(principalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      command: HelpdeskApplicationAutomationCommandsCreateRuleCreatePrincipalAutomationRuleCommand,
    ) => {
      const client = await createHelpdeskApiClient(PrincipalAutomationApi);
      const response = await client.v1PrincipalsPrincipalIdAutomationRulesPost(
        principalId,
        {
          ...command,
          principalId,
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
    },
  });
}

export function useUpdatePrincipalAutomationRule(principalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      command,
    }: {
      id: string;
      command: HelpdeskApplicationAutomationCommandsUpdateRuleUpdatePrincipalAutomationRuleCommand;
    }) => {
      const client = await createHelpdeskApiClient(PrincipalAutomationApi);
      await client.v1PrincipalsPrincipalIdAutomationRulesIdPut(
        principalId,
        id,
        {
          ...command,
          id,
          principalId,
        },
      );
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId, id] });
    },
  });
}

export function useDeletePrincipalAutomationRule(principalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const client = await createHelpdeskApiClient(PrincipalAutomationApi);
      await client.v1PrincipalsPrincipalIdAutomationRulesIdDelete(
        principalId,
        id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
    },
  });
}
