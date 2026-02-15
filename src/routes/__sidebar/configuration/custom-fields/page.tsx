import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BaseTable, TablePagination } from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { Icon } from '@brainforgeau/components/base';
import {
  CustomFieldEditorModal,
  createCustomFieldsColumns,
  useCustomFieldsData,
  useCustomFieldsTable,
} from '@components/custom-fields';
import { addToast } from '@heroui/react';
import { Helmet } from '@modern-js/runtime/head';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { CustomFieldsApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CustomFieldDefinitionDto } from '@/types/custom-field';

type CustomFieldTabType = 'tickets' | 'users' | 'companies' | 'assets';

function CustomFieldsPage() {
  const [selectedTab, setSelectedTab] = useState<CustomFieldTabType>('tickets');
  const { items, totalCount, pagination, setPagination, isLoading, refetch } = useCustomFieldsData();
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinitionDto | undefined>(undefined);

  const deleteMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      const client = await createHelpdeskApiClient(CustomFieldsApi);
      await client.v1CustomFieldsIdDelete(fieldId);
    },
    onSuccess: () => {
      addToast({ title: 'Custom field deleted successfully', severity: 'success' });
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
    [items]
  );

  const handleDelete = useCallback(
    (fieldId: string) => {
      deleteMutation.mutate(fieldId);
    },
    [deleteMutation]
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
    () => createCustomFieldsColumns({ onEdit: handleEdit, onDelete: handleDelete }),
    [handleEdit, handleDelete]
  );

  const { table } = useCustomFieldsTable({
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
          setPagination(prev => ({ ...prev, pageIndex: page - 1 }))
        }
      />
    );
  };

  return (
    <>
      <Helmet>
        <title>Custom Fields</title>
      </Helmet>
      <div className="mb-5">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Configuration', href: '/configuration' },
            { label: 'Custom Fields', href: '/configuration/custom-fields', isCurrent: true },
          ]}
        />

        <div className="mb-5 items-start gap-5 lg:flex">
          <h1 className="text-gray mb-2 text-2xl font-semibold md:mb-0 dark:text-white">
            Custom Fields
          </h1>
          <div className="flex shrink-0 justify-end gap-2.5 md:ml-auto">
            <BaseButton
              icon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onPress={handleCreate}
            >
              Custom Field
            </BaseButton>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left Sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-default-200 pr-6">
          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedTab('tickets')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTab === 'tickets'
                  ? 'bg-primary text-white'
                  : 'text-default-700 hover:bg-default-100'
              }`}
            >
              Custom fields (Tickets)
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('users')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTab === 'users'
                  ? 'bg-primary text-white'
                  : 'text-default-700 hover:bg-default-100'
              }`}
            >
              Custom fields (Users)
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('companies')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTab === 'companies'
                  ? 'bg-primary text-white'
                  : 'text-default-700 hover:bg-default-100'
              }`}
            >
              Custom fields (Companies)
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('assets')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTab === 'assets'
                  ? 'bg-primary text-white'
                  : 'text-default-700 hover:bg-default-100'
              }`}
            >
              Custom fields (Assets)
            </button>
          </nav>
        </div>

        {/* Right Content */}
        <div className="flex-1">
          {selectedTab === 'tickets' ? (
            <BaseTable
              fullHeight
              table={table}
              showInfo={false}
              paginationTemplate={paginationTemplate}
              isLoading={isLoading}
              loading={{ title: 'Loading...' }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-lg">
              <Icon name="inbox" className="h-12 w-12 text-default-300 mb-3" />
              <p className="text-default-500 mb-1">No custom fields yet</p>
              <p className="text-default-400 text-sm mb-4">
                Custom fields for {selectedTab} are not yet available
              </p>
            </div>
          )}
        </div>
      </div>

      <CustomFieldEditorModal
        isOpen={isEditorModalOpen}
        onClose={handleCloseModal}
        field={editingField}
      />
    </>
  );
}

export default CustomFieldsPage;
