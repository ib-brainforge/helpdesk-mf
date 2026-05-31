import {
  createEmailTemplatesColumns,
  useEmailTemplatesData,
  useEmailTemplatesTable,
} from '@/components/email-templates';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { BaseButton, Icon } from '@brainforgeau/components';
import {
  EmptyState,
  ListPage,
  useConfirm,
} from '@brainforgeau/components/page';
import { AppSettingsApi } from '@brainforgeau/helpdesk-client';
import { withAuthorizationRequired } from '@brainforgeau/security';
import { toast } from '@heroui/react';

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

  return (
    <ListPage
      title="Email Templates"
      breadcrumbsKey="configuration.email-templates.list"
      table={table}
      isLoading={isLoading}
      actions={
        <BaseButton
          icon={<Icon name="plus" className="h-3.5 w-3.5" />}
          onPress={() => navigate('/configuration/email-templates/new')}
        >
          Email Template
        </BaseButton>
      }
      empty={
        <EmptyState
          title="No email templates yet"
          description="Create your first email template to customise outbound notifications."
          action={
            <BaseButton
              onPress={() => navigate('/configuration/email-templates/new')}
            >
              New Email Template
            </BaseButton>
          }
          live
        />
      }
      modals={dialog}
    />
  );
}

export default withAuthorizationRequired(EmailTemplatesPage, {
  requiredPermissions: ['Helpdesk.Settings.Manage'],
});
