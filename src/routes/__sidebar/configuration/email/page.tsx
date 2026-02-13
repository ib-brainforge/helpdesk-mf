import { useState, useCallback, useMemo } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { useMutation } from '@tanstack/react-query';
import { BaseTable, TablePagination, BaseButton, Icon } from '@brainforgeau/components';
import { addToast } from '@heroui/react';
import {
  useMailServersData,
  useMailServersTable,
  createMailServersColumns,
  MailServerEditorModal,
  type MailServerRow,
} from '@/components/email-settings';
import type { MailServerConfigDto } from '@/types/email';

function EmailSettingsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMailServer, setEditingMailServer] = useState<MailServerConfigDto | null>(null);
  const { items, totalCount, pagination, setPagination, isLoading, refetch } = useMailServersData();

  // REVIEW: Delete endpoint not implemented yet in backend - would be v1/mail-servers/{id} DELETE
  const deleteMutation = useMutation({
    mutationFn: async (mailServerId: string) => {
      addToast({
        title: 'Feature not available',
        description: 'Delete functionality not yet implemented - backend endpoint pending',
        severity: 'warning',
      });
      throw new Error('Delete functionality not yet available - backend endpoint pending');
    },
    onError: () => {
      // Error already shown in mutationFn
    },
  });

  // REVIEW: Test connection endpoint not implemented yet in backend - would be v1/mail-servers/{id}/test POST
  const testConnectionMutation = useMutation({
    mutationFn: async (mailServerId: string) => {
      addToast({
        title: 'Feature not available',
        description: 'Test connection not yet implemented - backend endpoint pending',
        severity: 'warning',
      });
      throw new Error('Test connection not yet available - backend endpoint pending');
    },
    onError: () => {
      // Error already shown in mutationFn
    },
  });

  const handleEdit = useCallback(
    (mailServerId: string) => {
      const mailServer = items.find((item) => item.id === mailServerId);
      if (mailServer) {
        setEditingMailServer(mailServer);
      }
    },
    [items],
  );

  const handleDelete = useCallback(
    (mailServerId: string) => {
      if (confirm('Are you sure you want to delete this mail server?')) {
        deleteMutation.mutate(mailServerId);
      }
    },
    [deleteMutation],
  );

  const handleTest = useCallback(
    (mailServerId: string) => {
      testConnectionMutation.mutate(mailServerId);
    },
    [testConnectionMutation],
  );

  const columns = useMemo(
    () => createMailServersColumns({ onEdit: handleEdit, onDelete: handleDelete, onTest: handleTest }),
    [handleEdit, handleDelete, handleTest],
  );

  const { table } = useMailServersTable({
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
        <title>Email Settings - Configuration</title>
      </Helmet>
      <div className="mb-5">
        <div className="mb-5 items-start gap-5 lg:flex">
          <h1 className="text-gray mb-2 text-2xl font-semibold md:mb-0 dark:text-white">
            Email Settings
          </h1>
          <div className="flex shrink-0 justify-end gap-2.5 md:ml-auto">
            <BaseButton
              icon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onPress={() => setIsCreateModalOpen(true)}
            >
              Mail Server
            </BaseButton>
          </div>
        </div>
      </div>

      <BaseTable
        fullHeight
        table={table}
        showInfo={false}
        paginationTemplate={paginationTemplate}
        isLoading={isLoading}
        loading={{ title: 'Loading...' }}
      />

      <MailServerEditorModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <MailServerEditorModal
        isOpen={!!editingMailServer}
        onClose={() => setEditingMailServer(null)}
        mailServer={editingMailServer ?? undefined}
      />
    </>
  );
}

export default EmailSettingsPage;
