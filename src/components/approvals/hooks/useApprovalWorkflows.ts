import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import type { PaginationState } from '@tanstack/react-table';
// REVIEW: Approval APIs will be available after backend is deployed and client is regenerated
// import { ApprovalsApi, ApprovalWorkflowsApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { addToast } from '@heroui/react';
import type {
  ApprovalWorkflowListDto,
  ApprovalWorkflowDto,
  CreateApprovalWorkflowCommand,
  UpdateApprovalWorkflowCommand,
  TicketApprovalDto,
  PendingApprovalDto,
  RequestApprovalCommand,
  MakeApprovalDecisionCommand,
} from '@/types/approval';

// REVIEW: Temporary placeholder classes until backend API client is regenerated
class ApprovalWorkflowsApi {
  async v1ApprovalWorkflowsGet(...args: any[]) {
    return { data: { items: [], totalCount: 0 } };
  }
  async v1ApprovalWorkflowsIdGet(...args: any[]) {
    return { data: null };
  }
  async v1ApprovalWorkflowsPost(...args: any[]) {
    return { data: null };
  }
  async v1ApprovalWorkflowsIdPut(...args: any[]) {
    return { data: null };
  }
  async v1ApprovalWorkflowsIdDelete(...args: any[]) {
    return { data: null };
  }
}

class ApprovalsApi {
  async v1ApprovalsTicketTicketIdGet(...args: any[]) {
    return { data: null };
  }
  async v1ApprovalsPendingGet(...args: any[]) {
    return { data: { items: [], totalCount: 0 } };
  }
  async v1ApprovalsRequestPost(...args: any[]) {
    return { data: null };
  }
  async v1ApprovalsIdDecidePost(...args: any[]) {
    return { data: null };
  }
  async v1ApprovalsIdCancelPost(...args: any[]) {
    return { data: null };
  }
}

// REVIEW: Using TanStack Query for data fetching with generated client

export const useApprovalWorkflows = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const { data, isLoading, refetch } = useQuery<ApprovalWorkflowListDto[]>({
    queryKey: ['approval-workflows', pagination.pageIndex, pagination.pageSize],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ApprovalWorkflowsApi as any);
      const { data } = await (client as ApprovalWorkflowsApi).v1ApprovalWorkflowsGet(
        undefined, // categoryId
        undefined, // isActive
        pagination.pageIndex + 1,
        pagination.pageSize
      );
      // API returns PagedResult, extract items
      return ((data as any)?.items || []).map((workflow: any) => ({
        id: workflow.id!,
        name: workflow.name!,
        description: workflow.description,
        categoryName: workflow.categoryName,
        approvalMode: workflow.approvalMode ?? 0,
        isActive: workflow.isActive ?? false,
        stepsCount: workflow.steps?.length ?? 0,
      }));
    },
  });

  const items = data ?? [];
  const totalCount = data?.length ?? 0;

  return {
    items,
    totalCount,
    pagination,
    setPagination,
    isLoading,
    refetch: useCallback(() => {
      refetch();
    }, [refetch]),
  };
};

export const useApprovalWorkflow = (workflowId?: string) => {
  return useQuery<ApprovalWorkflowDto | null>({
    queryKey: ['approval-workflow', workflowId],
    queryFn: async () => {
      if (!workflowId) return null;
      const client = await createHelpdeskApiClient(ApprovalWorkflowsApi as any);
      const { data } = await (client as ApprovalWorkflowsApi).v1ApprovalWorkflowsIdGet(workflowId);
      return (data as ApprovalWorkflowDto | null) ?? null;
    },
    enabled: !!workflowId,
  });
};

export const useCreateApprovalWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (command: CreateApprovalWorkflowCommand) => {
      const client = await createHelpdeskApiClient(ApprovalWorkflowsApi as any);
      const { data } = await (client as ApprovalWorkflowsApi).v1ApprovalWorkflowsPost(command);
      return data;
    },
    onSuccess: () => {
      addToast({ title: 'Approval workflow created successfully', severity: 'success' });
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });
};

export const useUpdateApprovalWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, command }: { id: string; command: UpdateApprovalWorkflowCommand }) => {
      const client = await createHelpdeskApiClient(ApprovalWorkflowsApi as any);
      await (client as ApprovalWorkflowsApi).v1ApprovalWorkflowsIdPut(id, command);
    },
    onSuccess: (_, { id }) => {
      addToast({ title: 'Approval workflow updated successfully', severity: 'success' });
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['approval-workflow', id] });
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });
};

export const useDeleteApprovalWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workflowId: string) => {
      const client = await createHelpdeskApiClient(ApprovalWorkflowsApi as any);
      await (client as ApprovalWorkflowsApi).v1ApprovalWorkflowsIdDelete(workflowId);
    },
    onSuccess: () => {
      addToast({ title: 'Approval workflow deleted successfully', severity: 'success' });
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });
};

export const useTicketApproval = (ticketId?: string) => {
  return useQuery<TicketApprovalDto | null>({
    queryKey: ['ticket-approval', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const client = await createHelpdeskApiClient(ApprovalsApi as any);
      const { data } = await (client as ApprovalsApi).v1ApprovalsTicketTicketIdGet(ticketId);
      return (data as TicketApprovalDto | null) ?? null;
    },
    enabled: !!ticketId,
  });
};

export const usePendingApprovals = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const { data, isLoading, refetch } = useQuery<PendingApprovalDto[]>({
    queryKey: ['pending-approvals', pagination.pageIndex, pagination.pageSize],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ApprovalsApi as any);
      const { data } = await (client as ApprovalsApi).v1ApprovalsPendingGet(
        pagination.pageIndex + 1,
        pagination.pageSize
      );
      // API returns PagedResult, extract items
      return ((data as any)?.items || []) as PendingApprovalDto[];
    },
  });

  const items = data ?? [];
  const totalCount = data?.length ?? 0;

  return {
    items,
    totalCount,
    pagination,
    setPagination,
    isLoading,
    refetch: useCallback(() => {
      refetch();
    }, [refetch]),
  };
};

export const useRequestApproval = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (command: RequestApprovalCommand) => {
      const client = await createHelpdeskApiClient(ApprovalsApi as any);
      const { data } = await (client as ApprovalsApi).v1ApprovalsRequestPost(command);
      return data;
    },
    onSuccess: (_, { ticketId }) => {
      addToast({ title: 'Approval requested successfully', severity: 'success' });
      queryClient.invalidateQueries({ queryKey: ['ticket-approval', ticketId] });
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
    mutationFn: async (command: MakeApprovalDecisionCommand) => {
      const client = await createHelpdeskApiClient(ApprovalsApi as any);
      await (client as ApprovalsApi).v1ApprovalsIdDecidePost(command.approvalId, {
        stepId: command.stepId,
        decision: command.decision,
        comment: command.comment,
      });
    },
    onSuccess: () => {
      addToast({ title: 'Decision recorded successfully', severity: 'success' });
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
      const client = await createHelpdeskApiClient(ApprovalsApi as any);
      await (client as ApprovalsApi).v1ApprovalsIdCancelPost(approvalId);
    },
    onSuccess: () => {
      addToast({ title: 'Approval cancelled successfully', severity: 'success' });
      queryClient.invalidateQueries({ queryKey: ['ticket-approval'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });
};
