import { useState, useCallback, useMemo } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@modern-js/runtime/router';
import { BaseTable, TablePagination, BaseButton, Icon } from '@brainforgeau/components';
import { addToast } from '@heroui/react';
import { AutomationRulesApi } from '@/utils/automationRulesApiStub';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  useAutomationRulesData,
  useAutomationRulesTable,
  createAutomationRulesColumns,
} from '@/components/automation';

function AutomationRulesPage() {
  const navigate = useNavigate();
  const { items, totalCount, pagination, setPagination, isLoading, refetch } = useAutomationRulesData();

  const deleteMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const client = await createHelpdeskApiClient(AutomationRulesApi);
      await client.v1AutomationRulesIdDelete(ruleId);
    },
    onSuccess: () => {
      addToast({ title: 'Automation rule deleted successfully', severity: 'success' });
      refetch();
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });

  const toggleEnabledMutation = useMutation({
    mutationFn: async ({ ruleId, enabled }: { ruleId: string; enabled: boolean }) => {
      const client = await createHelpdeskApiClient(AutomationRulesApi);
      if (enabled) {
        await client.v1AutomationRulesIdEnablePost(ruleId);
      } else {
        await client.v1AutomationRulesIdDisablePost(ruleId);
      }
    },
    onSuccess: () => {
      refetch();
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (ruleIds: string[]) => {
      const client = await createHelpdeskApiClient(AutomationRulesApi);
      const ruleOrders = ruleIds.map((ruleId, index) => ({ ruleId, sortOrder: index }));
      await client.v1AutomationRulesReorderPost({ ruleOrders });
    },
    onSuccess: () => {
      addToast({ title: 'Rule order updated successfully', severity: 'success' });
      refetch();
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });

  // REVIEW: Backend doesn't have a duplicate endpoint, so using GET+POST pattern
  const duplicateMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const client = await createHelpdeskApiClient(AutomationRulesApi);
      // Fetch the rule details
      const { data: rule } = await client.v1AutomationRulesIdGet(ruleId);

      if (!rule) {
        throw new Error('Rule not found');
      }

      // Create a new rule with the same details but updated name
      await client.v1AutomationRulesPost({
        name: `${rule.name} (Copy)`,
        description: rule.description,
        triggerType: rule.triggerType,
        matchType: rule.matchType,
        conditions: rule.conditions || [],
        actions: rule.actions || [],
        elseActions: rule.elseActions || [],
        isEnabled: false, // Duplicate as disabled for safety
        isNested: false,
      });
    },
    onSuccess: () => {
      addToast({ title: 'Automation rule duplicated successfully', severity: 'success' });
      refetch();
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });

  const handleEdit = useCallback(
    (ruleId: string) => {
      navigate(`/configuration/automation/${ruleId}`);
    },
    [navigate],
  );

  const handleDelete = useCallback(
    (ruleId: string) => {
      if (confirm('Are you sure you want to delete this automation rule?')) {
        deleteMutation.mutate(ruleId);
      }
    },
    [deleteMutation],
  );

  const handleToggleEnabled = useCallback(
    (ruleId: string, enabled: boolean) => {
      toggleEnabledMutation.mutate({ ruleId, enabled });
    },
    [toggleEnabledMutation],
  );

  const handleMoveUp = useCallback(
    (ruleId: string) => {
      const currentIndex = items.findIndex((r) => r.id === ruleId);
      if (currentIndex > 0) {
        const newOrder = [...items];
        [newOrder[currentIndex - 1], newOrder[currentIndex]] = [
          newOrder[currentIndex],
          newOrder[currentIndex - 1],
        ];
        reorderMutation.mutate(newOrder.map((r) => r.id));
      }
    },
    [items, reorderMutation],
  );

  const handleMoveDown = useCallback(
    (ruleId: string) => {
      const currentIndex = items.findIndex((r) => r.id === ruleId);
      if (currentIndex < items.length - 1) {
        const newOrder = [...items];
        [newOrder[currentIndex], newOrder[currentIndex + 1]] = [
          newOrder[currentIndex + 1],
          newOrder[currentIndex],
        ];
        reorderMutation.mutate(newOrder.map((r) => r.id));
      }
    },
    [items, reorderMutation],
  );

  const handleDuplicate = useCallback(
    (ruleId: string) => {
      duplicateMutation.mutate(ruleId);
    },
    [duplicateMutation],
  );

  const columns = useMemo(
    () =>
      createAutomationRulesColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        onToggleEnabled: handleToggleEnabled,
        onMoveUp: handleMoveUp,
        onMoveDown: handleMoveDown,
        onDuplicate: handleDuplicate,
      }),
    [handleEdit, handleDelete, handleToggleEnabled, handleMoveUp, handleMoveDown, handleDuplicate],
  );

  const { table } = useAutomationRulesTable({
    data: items,
    columns,
    totalCount,
    pagination,
    onPaginationChange: setPagination,
  });

  const paginationTemplate = () => {
    const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
    return (
      <TablePagination
        totalPages={totalPages}
        currentPage={pagination.pageIndex + 1}
        onPageChange={(page: number) =>
          setPagination((prev) => ({ ...prev, pageIndex: page - 1 }))
        }
      />
    );
  };

  return (
    <>
      <Helmet>
        <title>Automation Rules - Configuration</title>
      </Helmet>
      <div className="mb-5">
        <div className="mb-5 items-start gap-5 lg:flex">
          <h1 className="text-gray mb-2 text-2xl font-semibold md:mb-0 dark:text-white">
            Automation Rules
          </h1>
          <div className="flex shrink-0 justify-end gap-2.5 md:ml-auto">
            <BaseButton
              icon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onPress={() => navigate('/configuration/automation/new')}
            >
              Automation Rule
            </BaseButton>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Rules are executed in order. Drag rules to reorder them.
        </p>
      </div>

      <BaseTable
        fullHeight
        table={table}
        showInfo={false}
        paginationTemplate={paginationTemplate}
        isLoading={isLoading}
        loading={{ title: 'Loading...' }}
      />
    </>
  );
}

export default AutomationRulesPage;
