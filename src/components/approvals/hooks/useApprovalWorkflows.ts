import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  ApprovalWorkflowsApi,
  ApprovalsApi,
  type HelpdeskApplicationApprovalsCommandsCreateApprovalWorkflowCreateApprovalWorkflowCommand,
  type HelpdeskApplicationApprovalsCommandsMakeApprovalDecisionMakeApprovalDecisionCommand,
  type HelpdeskApplicationApprovalsCommandsRequestApprovalRequestApprovalCommand,
} from '@brainforgeau/helpdesk-client';
import { toast } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// REVIEW: The generated ApprovalWorkflowsApi only exposes
// `v1ApprovalWorkflowsPost` (create) for the tenant-scoped workflow list —
// there is no backend GET list/detail, PUT, or DELETE endpoint yet (only the
// admin-console PrincipalApprovalsApi, keyed by principalId, has full CRUD).
// This is a genuine backend/frontend contract gap, not a client-wiring issue.
// useApprovalWorkflow / useUpdateApprovalWorkflow / useDeleteApprovalWorkflow
// below are left as unimplemented no-ops (surfacing the gap explicitly)
// until the backend adds tenant-scoped list/detail/update/delete endpoints.

export const useCreateApprovalWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      command: HelpdeskApplicationApprovalsCommandsCreateApprovalWorkflowCreateApprovalWorkflowCommand,
    ) => {
      const client = await createHelpdeskApiClient(ApprovalWorkflowsApi);
      const { data } = await client.v1ApprovalWorkflowsPost(command);
      return data;
    },
    onSuccess: () => {
      toast('Approval workflow created successfully', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });
};

export const useTicketApproval = (ticketId?: string) => {
  return useQuery({
    queryKey: ['ticket-approval', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const client = await createHelpdeskApiClient(ApprovalsApi);
      const { data } = await client.v1ApprovalsTicketTicketIdGet(ticketId);
      return data ?? null;
    },
    enabled: !!ticketId,
  });
};

export const usePendingApprovals = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ApprovalsApi);
      const { data } = await client.v1ApprovalsPendingGet();
      return data;
    },
  });

  return {
    items: data?.items ?? [],
    totalCount: data?.totalCount ?? 0,
    isLoading,
    refetch: () => {
      refetch();
    },
  };
};

export const useRequestApproval = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      command: HelpdeskApplicationApprovalsCommandsRequestApprovalRequestApprovalCommand,
    ) => {
      const client = await createHelpdeskApiClient(ApprovalsApi);
      const { data } = await client.v1ApprovalsRequestPost(command);
      return data;
    },
    onSuccess: (_, command) => {
      toast('Approval requested successfully', { variant: 'success' });
      queryClient.invalidateQueries({
        queryKey: ['ticket-approval', command.ticketId],
      });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });
};

export const useMakeApprovalDecision = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      command: HelpdeskApplicationApprovalsCommandsMakeApprovalDecisionMakeApprovalDecisionCommand,
    ) => {
      const client = await createHelpdeskApiClient(ApprovalsApi);
      await client.v1ApprovalsIdDecidePost(command.approvalId!, command);
    },
    onSuccess: () => {
      toast('Decision recorded successfully', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['ticket-approval'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });
};

export const useCancelApproval = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (approvalId: string) => {
      const client = await createHelpdeskApiClient(ApprovalsApi);
      await client.v1ApprovalsIdCancelPost(approvalId);
    },
    onSuccess: () => {
      toast('Approval cancelled successfully', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['ticket-approval'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });
};
