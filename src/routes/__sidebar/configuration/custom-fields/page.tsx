import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import {
  CustomFieldEditorModal,
  createCustomFieldsColumns,
  useCustomFieldsData,
  useCustomFieldsTable,
} from '@components/custom-fields';

import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CustomFieldDefinitionDto } from '@/types/custom-field';
import {
  EmptyState,
  ListPage,
  useConfirm,
} from '@brainforgeau/components/page';
import { CustomFieldsApi } from '@brainforgeau/helpdesk-client';
import { withAuthorizationRequired } from '@brainforgeau/security';
import { toast } from '@heroui/react';
import { useSearchParams } from '@modern-js/runtime/router';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

type CustomFieldTabType = 'tickets' | 'users' | 'companies' | 'assets';

const TAB_LABELS: Record<CustomFieldTabType, string> = {
  tickets: 'Custom fields (Tickets)',
  users: 'Custom fields (Users)',
  companies: 'Custom fields (Companies)',
  assets: 'Custom fields (Assets)',
};

const CUSTOM_FIELD_VALID_TABS = new Set<string>([
  'tickets',
  'users',
  'companies',
  'assets',
]);
const CUSTOM_FIELD_DEFAULT_TAB: CustomFieldTabType = 'tickets';

function CustomFieldsPage() {
  // URL query-param tab persistence: ?tab=<key> synced to selected tab.
  // Falls back to the first tab (CUSTOM_FIELD_DEFAULT_TAB) when the param is absent or unknown.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab: CustomFieldTabType = (() => {
    const param = searchParams.get('tab');
    return param && CUSTOM_FIELD_VALID_TABS.has(param)
      ? (param as CustomFieldTabType)
      : CUSTOM_FIELD_DEFAULT_TAB;
  })();
  const setSelectedTab = (key: CustomFieldTabType) => {
    setSearchParams(
      prev => {
        prev.set('tab', key);
        return prev;
      },
      { replace: true },
    );
  };
  const { items, totalCount, pagination, setPagination, isLoading, refetch } =
    useCustomFieldsData();
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<
    CustomFieldDefinitionDto | undefined
  >(undefined);
  const { confirm, dialog } = useConfirm();

  const deleteMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      const client = await createHelpdeskApiClient(CustomFieldsApi);
      await client.v1CustomFieldsIdDelete(fieldId);
    },
    onSuccess: () => {
      toast('Custom field deleted successfully', { variant: 'success' });
      refetch();
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });

  const handleEdit = useCallback(
    (fieldId: string) => {
      const field = items.find(item => item.id === fieldId);
      if (field) {
        setEditingField(field);
        setIsEditorModalOpen(true);
      }
    },
    [items],
  );

  const handleDelete = useCallback(
    async (fieldId: string) => {
      const field = items.find(item => item.id === fieldId);
      const ok = await confirm({
        title: 'Delete Custom Field',
        body: `Delete "${field?.name ?? 'this field'}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok) return;
      deleteMutation.mutate(fieldId);
    },
    [confirm, deleteMutation, items],
  );

  const handleCreate = () => {
    setEditingField(undefined);
    setIsEditorModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditorModalOpen(false);
    setEditingField(undefined);
  };

  const columns = useMemo(
    () =>
      createCustomFieldsColumns({ onEdit: handleEdit, onDelete: handleDelete }),
    [handleEdit, handleDelete],
  );

  const { table } = useCustomFieldsTable({
    // Only pass real data when on the tickets tab — other tabs are not yet implemented
    data: selectedTab === 'tickets' ? items : [],
    columns,
    totalCount: selectedTab === 'tickets' ? totalCount : 0,
    pagination,
    onPaginationChange: setPagination,
  });

  const sidebar = (
    <nav className="space-y-1 pr-6 border-r border-default-200">
      {(Object.keys(TAB_LABELS) as CustomFieldTabType[]).map(key => (
        <button
          key={key}
          type="button"
          onClick={() => setSelectedTab(key)}
          className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedTab === key
              ? 'bg-primary text-white'
              : 'text-default-700 hover:bg-default-100'
          }`}
        >
          {TAB_LABELS[key]}
        </button>
      ))}
    </nav>
  );

  return (
    <ListPage
      title="Custom Fields"
      breadcrumbsKey="configuration.custom-fields.list"
      table={table}
      isLoading={selectedTab === 'tickets' ? isLoading : false}
      actions={
        <BaseButton
          icon={<Icon name="plus" className="h-3.5 w-3.5" />}
          onPress={handleCreate}
        >
          Custom Field
        </BaseButton>
      }
      sidebar={sidebar}
      empty={
        <EmptyState
          title="No custom fields yet"
          description={
            selectedTab === 'tickets'
              ? 'Add your first custom field to extend ticket data.'
              : `Custom fields for ${selectedTab} are not yet available.`
          }
          action={
            selectedTab === 'tickets' ? (
              <BaseButton onPress={handleCreate}>
                Create Custom Field
              </BaseButton>
            ) : undefined
          }
          live
        />
      }
      modals={
        <>
          <CustomFieldEditorModal
            isOpen={isEditorModalOpen}
            onClose={handleCloseModal}
            field={editingField}
          />
          {dialog}
        </>
      }
    />
  );
}

export default withAuthorizationRequired(CustomFieldsPage, {
  requiredPermissions: ['Helpdesk.Settings.Manage'],
});
