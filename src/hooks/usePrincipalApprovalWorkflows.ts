import {
  type HelpdeskApplicationApprovalsCommandsCreateApprovalWorkflowCreatePrincipalApprovalWorkflowCommand,
  type HelpdeskApplicationApprovalsCommandsUpdateApprovalWorkflowUpdatePrincipalApprovalWorkflowCommand,
  PrincipalApprovalsApi,
} from '@/api/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const QUERY_KEY = 'principal-approval-workflows';

export function usePrincipalApprovalWorkflows(
  principalId: string,
  isActive?: boolean,
) {
  return useQuery({
    queryKey: [QUERY_KEY, principalId, isActive],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(PrincipalApprovalsApi);
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
      const client = await createHelpdeskApiClient(PrincipalApprovalsApi);
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
      command: HelpdeskApplicationApprovalsCommandsCreateApprovalWorkflowCreatePrincipalApprovalWorkflowCommand,
    ) => {
      const client = await createHelpdeskApiClient(PrincipalApprovalsApi);
      const response =
        await client.v1PrincipalsPrincipalIdApprovalWorkflowsPost(
          principalId,
          command,
        );
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
      command: HelpdeskApplicationApprovalsCommandsUpdateApprovalWorkflowUpdatePrincipalApprovalWorkflowCommand;
    }) => {
      const client = await createHelpdeskApiClient(PrincipalApprovalsApi);
      await client.v1PrincipalsPrincipalIdApprovalWorkflowsIdPut(
        principalId,
        id,
        command,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, principalId, variables.id],
      });
    },
  });
}

export function useDeletePrincipalApprovalWorkflow(principalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const client = await createHelpdeskApiClient(PrincipalApprovalsApi);
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
