/**
 * usePrincipalAutomation — CRUD hooks for principal-scoped automation rules.
 *
 * The published @brainforgeau/helpdesk-client does not yet export PrincipalAutomationApi
 * or the Principal-prefixed command types. We use AutomationRulesApi as the class token
 * (for createHelpdeskApiClient) and cast to `any` to call the principal-scoped methods
 * at runtime. The backend routes /v1/principals/{principalId}/automation-rules/* exist.
 *
 * REVIEW: Remove casts once helpdesk-backend republishes with PrincipalAutomationApi exported.
 */

import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  type HelpdeskApplicationAutomationCommandsCreateRuleCreateAutomationRuleCommand,
  type HelpdeskApplicationAutomationCommandsUpdateRuleUpdateAutomationRuleCommand,
  type HelpdeskDomainAutomationEnumsAutomationTriggerType,
  AutomationRulesApi,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(AutomationRulesApi);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(AutomationRulesApi);
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
      command: HelpdeskApplicationAutomationCommandsCreateRuleCreateAutomationRuleCommand,
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(AutomationRulesApi);
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
      command: HelpdeskApplicationAutomationCommandsUpdateRuleUpdateAutomationRuleCommand;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(AutomationRulesApi);
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId, variables.id] });
    },
  });
}

export function useDeletePrincipalAutomationRule(principalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(AutomationRulesApi);
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

export function useEnablePrincipalAutomationRule(principalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(AutomationRulesApi);
      await client.v1PrincipalsPrincipalIdAutomationRulesIdEnablePost(
        principalId,
        id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
    },
  });
}

export function useDisablePrincipalAutomationRule(principalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(AutomationRulesApi);
      await client.v1PrincipalsPrincipalIdAutomationRulesIdDisablePost(
        principalId,
        id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
    },
  });
}
