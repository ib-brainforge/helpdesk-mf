import {
  ApprovalWorkflowsApi,
  ApprovalsApi,
  type HelpdeskApplicationApprovalsCommandsCreateApprovalWorkflowCreateApprovalWorkflowCommand,
  type HelpdeskApplicationApprovalsCommandsMakeApprovalDecisionMakeApprovalDecisionCommand,
  type HelpdeskApplicationApprovalsCommandsRequestApprovalRequestApprovalCommand,
  type HelpdeskApplicationApprovalsCommandsUpdateApprovalWorkflowUpdateApprovalWorkflowCommand,
} from '@/api/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { toast } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const QUERY_KEY = 'approval-workflows';

export const useApprovalWorkflows = (isActive?: boolean) => {
  return useQuery({
    queryKey: [QUERY_KEY, isActive],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ApprovalWorkflowsApi);
      const { data } = await client.v1ApprovalWorkflowsGet(isActive);
      return data ?? [];
    },
  });
};

export const useApprovalWorkflow = (id?: string) => {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ApprovalWorkflowsApi);
      const { data } = await client.v1ApprovalWorkflowsIdGet(id!);
      return data;
    },
    enabled: !!id,
  });
};

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
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });
};

export const useUpdateApprovalWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      command,
    }: {
      id: string;
      command: HelpdeskApplicationApprovalsCommandsUpdateApprovalWorkflowUpdateApprovalWorkflowCommand;
    }) => {
      const client = await createHelpdeskApiClient(ApprovalWorkflowsApi);
      await client.v1ApprovalWorkflowsIdPut(id, command);
    },
    onSuccess: (_data, variables) => {
      toast('Approval workflow saved', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });
};

export const useDeleteApprovalWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = await createHelpdeskApiClient(ApprovalWorkflowsApi);
      await client.v1ApprovalWorkflowsIdDelete(id);
    },
    onSuccess: () => {
      toast('Approval workflow deleted', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
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
