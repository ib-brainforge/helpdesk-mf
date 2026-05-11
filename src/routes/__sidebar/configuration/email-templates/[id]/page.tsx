/**
 * Email template detail page — /__sidebar/configuration/email-templates/[id]
 *
 * W1-P7: Migrated to <DetailPage> with useDetailTabState for ?tab= URL sync.
 * Single "details" tab is form-bearing; formActions (Save/Reset) in PageHeader.
 *
 * REVIEW: Email templates are stored in AppSettings with category 'EmailTemplate'.
 * Once backend grows a dedicated /email-templates endpoint and client is regenerated,
 * update the queryFn + mutationFn accordingly.
 */

import {
  NOTIFICATION_TYPE_LABELS,
  VariablePicker,
} from '@/components/email-templates';
import { useTabSearchParam } from '@/hooks/useTabSearchParam';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { NotificationType } from '@/types/email-template';
import type { EmailTemplateDto } from '@/types/email-template';
import {
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  PageSpinner,
} from '@brainforgeau/components';
import { BaseTextarea } from '@brainforgeau/components';
import {
  DetailPage,
  PendingCrumb,
  useDetailTabState,
  useEntityForm,
} from '@brainforgeau/components/page';
import { AppSettingsApi } from '@brainforgeau/helpdesk-client';
import { Switch } from '@heroui/react';
import { useParams } from '@modern-js/runtime/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  notificationType: z.nativeEnum(NotificationType),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  isActive: z.boolean(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

function formatFieldErrors(errors: unknown[]): string | undefined {
  if (!errors || errors.length === 0) return undefined;
  return errors
    .map(e =>
      typeof e === 'string'
        ? e
        : ((e as { message?: string }).message ?? String(e)),
    )
    .join(', ');
}

function EditEmailTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // REVIEW: Email templates are stored in AppSettings with category 'EmailTemplate'
  const { data: template, isLoading } = useQuery<EmailTemplateDto>({
    queryKey: ['email-template', id],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(AppSettingsApi);
      const { data: settings } = await client.v1AppSettingsGet(
        true,
        'EmailTemplate',
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setting = (settings || []).find((s: any) => s.id === id);

      if (!setting) {
        throw new Error('Template not found');
      }

      const templateData =
        typeof setting.value === 'string'
          ? JSON.parse(setting.value)
          : setting.value;

      return {
        id: setting.id!,
        name: setting.key || templateData.name || '',
        notificationType: templateData.notificationType ?? 0,
        subject: templateData.subject || '',
        body: templateData.body || '',
        isActive: setting.isActive ?? true,
      };
    },
    enabled: !!id,
  });

  const { getParam, setParam } = useTabSearchParam();
  const { activeTab, setActiveTab } = useDetailTabState({
    defaultTab: 'details',
    getParam,
    setParam,
  });

  const detailsForm = useEntityForm<typeof templateSchema>({
    schema: templateSchema,
    defaultValues: {
      name: '',
      notificationType: NotificationType.TicketCreated,
      subject: '',
      body: '',
      isActive: true,
    },
    values: template
      ? {
          name: template.name,
          notificationType: template.notificationType,
          subject: template.subject,
          body: template.body,
          isActive: template.isActive,
        }
      : undefined,
    onSubmit: async (values: TemplateFormData) => {
      if (!id) return;
      const client = await createHelpdeskApiClient(AppSettingsApi);
      const templateData = {
        notificationType: values.notificationType,
        subject: values.subject,
        body: values.body,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await client.v1AppSettingsIdPut(id, {
        key: values.name,
        value: JSON.stringify(templateData),
        category: 'EmailTemplate',
        isActive: values.isActive,
      } as any);
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    invalidateQueryKeys: [['email-template', id]],
    toast: { success: 'Email template saved', error: 'Save failed' },
  });

  if (isLoading || !template) {
    return <PageSpinner title="Loading email template..." />;
  }

  const form = detailsForm.form;

  return (
    <DetailPage
      title={template.name || 'Email Template'}
      breadcrumbsKey="configuration.email-templates.detail"
      breadcrumbsParams={{
        id: id!,
        name: template.name ?? PendingCrumb,
      }}
      documentTitle={
        template.name ? `Email Template: ${template.name}` : undefined
      }
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <DetailPage.Tab
        id="details"
        title="Details"
        formActions={detailsForm.formActions}
      >
        <form className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <form.Field name="name">
                  {field => (
                    <BaseInput
                      label="Template Name"
                      isRequired
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={e => field.handleChange(e.target.value)}
                      errorMessage={formatFieldErrors(field.state.meta.errors)}
                      isInvalid={field.state.meta.errors.length > 0}
                      placeholder="Ticket Created Notification"
                    />
                  )}
                </form.Field>

                <form.Field name="notificationType">
                  {field => (
                    <BaseSelect
                      label="Notification Type"
                      isRequired
                      selectedKey={String(field.state.value)}
                      onSelectionChange={key => {
                        field.handleChange(Number(key) as NotificationType);
                      }}
                      errorMessage={formatFieldErrors(field.state.meta.errors)}
                      isInvalid={field.state.meta.errors.length > 0}
                    >
                      {Object.entries(NOTIFICATION_TYPE_LABELS).map(
                        ([key, label]) => (
                          <BaseSelectItem key={key}>{label}</BaseSelectItem>
                        ),
                      )}
                    </BaseSelect>
                  )}
                </form.Field>
              </div>

              <form.Field name="subject">
                {field => (
                  <BaseInput
                    label="Subject Line"
                    isRequired
                    name={field.name}
                    value={field.state.value}
                    onChange={e => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    errorMessage={formatFieldErrors(field.state.meta.errors)}
                    isInvalid={field.state.meta.errors.length > 0}
                    placeholder="New Ticket Created: {{ticket.subject}}"
                    description="Use Scriban syntax for variables (e.g., {{ticket.subject}})"
                  />
                )}
              </form.Field>

              <form.Field name="body">
                {field => (
                  <BaseTextarea
                    label="Email Body"
                    isRequired
                    name={field.name}
                    value={field.state.value}
                    onValueChange={field.handleChange}
                    errorMessage={formatFieldErrors(field.state.meta.errors)}
                    isInvalid={field.state.meta.errors.length > 0}
                    placeholder={
                      'Hello {{user.requesterName}},\n\nYour ticket has been created...'
                    }
                    description="Use Scriban syntax for variables"
                    minRows={15}
                    classNames={{
                      input: 'font-mono text-sm',
                    }}
                  />
                )}
              </form.Field>

              <form.Field name="isActive">
                {field => (
                  <Switch
                    isSelected={field.state.value}
                    onChange={field.handleChange}
                  >
                    Template is Active
                  </Switch>
                )}
              </form.Field>
            </div>

            <div className="lg:col-span-1">
              {/* REVIEW: Could enhance VariablePicker to insert at cursor position */}
              <VariablePicker onVariableSelect={() => undefined} />
            </div>
          </div>
        </form>
      </DetailPage.Tab>
    </DetailPage>
  );
}

export default EditEmailTemplatePage;
