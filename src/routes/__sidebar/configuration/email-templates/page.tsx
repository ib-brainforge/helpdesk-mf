import { useState, useCallback, useMemo } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@modern-js/runtime/router';
import { BaseTable, TablePagination, BaseButton, Icon } from '@brainforgeau/components';
import { addToast } from '@heroui/react';
import { AppSettingsApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  useEmailTemplatesData,
  useEmailTemplatesTable,
  createEmailTemplatesColumns,
} from '@/components/email-templates';

function EmailTemplatesPage() {
  const navigate = useNavigate();
  const { items, totalCount, pagination, setPagination, isLoading, refetch } = useEmailTemplatesData();

  // REVIEW: Email templates are stored in AppSettings with category 'EmailTemplate'
  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const client = await createHelpdeskApiClient(AppSettingsApi);
      await client.v1AppSettingsIdDelete(templateId);
    },
    onSuccess: () => {
      addToast({ title: 'Email template deleted successfully', severity: 'success' });
      refetch();
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });

  const handleEdit = useCallback(
    (templateId: string) => {
      navigate(`/configuration/email-templates/${templateId}`);
    },
    [navigate],
  );

  const handleDelete = useCallback(
    (templateId: string) => {
      if (confirm('Are you sure you want to delete this email template?')) {
        deleteMutation.mutate(templateId);
      }
    },
    [deleteMutation],
  );

  const columns = useMemo(
    () => createEmailTemplatesColumns({ onEdit: handleEdit, onDelete: handleDelete }),
    [handleEdit, handleDelete],
  );

  const { table } = useEmailTemplatesTable({
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
        <title>Email Templates - Configuration</title>
      </Helmet>
      <div className="mb-5">
        <div className="mb-5 items-start gap-5 lg:flex">
          <h1 className="text-gray mb-2 text-2xl font-semibold md:mb-0 dark:text-white">
            Email Templates
          </h1>
          <div className="flex shrink-0 justify-end gap-2.5 md:ml-auto">
            <BaseButton
              icon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onPress={() => navigate('/configuration/email-templates/new')}
            >
              Email Template
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
    </>
  );
}

export default EmailTemplatesPage;
