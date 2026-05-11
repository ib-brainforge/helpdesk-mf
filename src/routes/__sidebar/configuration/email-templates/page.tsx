import {
  createEmailTemplatesColumns,
  useEmailTemplatesData,
  useEmailTemplatesTable,
} from '@/components/email-templates';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  BaseButton,
  BaseTable,
  Icon,
  TablePagination,
} from '@brainforgeau/components';
import { useConfirm } from '@brainforgeau/components/page';
import { AppSettingsApi } from '@brainforgeau/helpdesk-client';
import { toast } from '@heroui/react';

import { Helmet } from '@modern-js/runtime/head';
import { useNavigate } from '@modern-js/runtime/router';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

function EmailTemplatesPage() {
  const navigate = useNavigate();
  const { items, totalCount, pagination, setPagination, isLoading, refetch } =
    useEmailTemplatesData();
  const { confirm, dialog } = useConfirm();

  // REVIEW: Email templates are stored in AppSettings with category 'EmailTemplate'
  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const client = await createHelpdeskApiClient(AppSettingsApi);
      await client.v1AppSettingsIdDelete(templateId);
    },
    onSuccess: () => {
      toast('Email template deleted successfully', { variant: 'success' });
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
    async (templateId: string) => {
      const ok = await confirm({
        title: 'Delete Email Template',
        body: 'Are you sure you want to delete this email template? This cannot be undone.',
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok) return;
      deleteMutation.mutate(templateId);
    },
    [confirm, deleteMutation],
  );

  const columns = useMemo(
    () =>
      createEmailTemplatesColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
      }),
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
          setPagination(prev => ({ ...prev, pageIndex: page - 1 }))
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

      {dialog}
    </>
  );
}

export default EmailTemplatesPage;
