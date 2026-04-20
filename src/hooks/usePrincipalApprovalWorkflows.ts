/**
 * usePrincipalApprovalWorkflows — CRUD hooks for principal-scoped approval workflows.
 *
 * The published @brainforgeau/helpdesk-client does not yet export PrincipalApprovalsApi
 * or the Principal-prefixed command types. We use ApprovalWorkflowsApi as the class token
 * and cast to `any` to call the principal-scoped methods at runtime.
 *
 * REVIEW: Remove casts once helpdesk-backend republishes with PrincipalApprovalsApi exported.
 */

import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  type HelpdeskApplicationApprovalsCommandsCreateApprovalWorkflowCreateApprovalWorkflowCommand,
  ApprovalWorkflowsApi,
} from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const QUERY_KEY = 'principal-approval-workflows';

// Reuse the non-principal type for the update command shape (same fields at runtime)
type UpdateApprovalWorkflowCommand = {
  name?: string;
  description?: string | null;
  approvalMode?: string;
  isActive?: boolean;
  triggerOnCreation?: boolean;
  triggerOnStatusChange?: boolean;
  steps?: unknown[];
};

export function usePrincipalApprovalWorkflows(
  principalId: string,
  isActive?: boolean,
) {
  return useQuery({
    queryKey: [QUERY_KEY, principalId, isActive],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(ApprovalWorkflowsApi);
      const response = await client.v1PrincipalsPrincipalIdApprovalWorkflowsGet(
        principalId,
        isActive,
      );
      return response.data ?? [];
    },
    enabled: Boolean(principalId),
  });
}

export function usePrincipalApprovalWorkflow(principalId: string, id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, principalId, id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(ApprovalWorkflowsApi);
      const response =
        await client.v1PrincipalsPrincipalIdApprovalWorkflowsIdGet(
          principalId,
          id,
        );
      return response.data;
    },
    enabled: Boolean(principalId) && Boolean(id),
  });
}

export function useCreatePrincipalApprovalWorkflow(principalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      command: HelpdeskApplicationApprovalsCommandsCreateApprovalWorkflowCreateApprovalWorkflowCommand,
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(ApprovalWorkflowsApi);
      const response =
        await client.v1PrincipalsPrincipalIdApprovalWorkflowsPost(principalId, {
          ...command,
          principalId,
        });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
    },
  });
}

export function useUpdatePrincipalApprovalWorkflow(principalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      command,
    }: {
      id: string;
      command: UpdateApprovalWorkflowCommand;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(ApprovalWorkflowsApi);
      await client.v1PrincipalsPrincipalIdApprovalWorkflowsIdPut(
        principalId,
        id,
        {
          ...command,
          workflowId: id,
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

export function useDeletePrincipalApprovalWorkflow(principalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(ApprovalWorkflowsApi);
      await client.v1PrincipalsPrincipalIdApprovalWorkflowsIdDelete(
        principalId,
        id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
    },
  });
}
