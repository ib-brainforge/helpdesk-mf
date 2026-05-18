/**
 * Create email template page — /__sidebar/configuration/email-templates/new
 *
 * W1-P8: Migrated to <FormPage> with useEntityForm.
 * Uses the `aside` slot for the VariablePicker (flagged in W0 review as the
 * one page that needs FormPage's right-column aside panel).
 */

import {
  NOTIFICATION_TYPE_LABELS,
  VariablePicker,
} from '@/components/email-templates';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { NotificationType } from '@/types/email-template';
import type { CreateEmailTemplateDto } from '@/types/email-template';
import {
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  BaseTextarea,
  BaseToggle,
} from '@brainforgeau/components';
import { FormPage, useEntityForm } from '@brainforgeau/components/page';
import { AppSettingsApi } from '@brainforgeau/helpdesk-client';
import { useNavigate } from '@modern-js/runtime/router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  notificationType: z.nativeEnum(NotificationType),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  isActive: z.boolean(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function NewEmailTemplatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateEmailTemplateDto) => {
      // REVIEW: Email templates are stored in AppSettings with category 'EmailTemplate'
      const client = await createHelpdeskApiClient(AppSettingsApi);
      const templateData = {
        notificationType: data.notificationType,
        subject: data.subject,
        body: data.body,
      };
      await client.v1AppSettingsPost({
        key: data.name,
        value: JSON.stringify(templateData),
        category: 'EmailTemplate',
        isActive: data.isActive,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      navigate('/configuration/email-templates');
    },
  });

  const form = useEntityForm<typeof templateSchema>({
    schema: templateSchema,
    defaultValues: {
      name: '',
      notificationType: NotificationType.TicketCreated,
      subject: '',
      body: '',
      isActive: true,
    },
    onSubmit: async (values: TemplateFormData) => {
      await createMutation.mutateAsync(values);
    },
    invalidateQueryKeys: [['email-templates']],
    toast: { success: 'Email template created', error: 'Create failed' },
  });

  const f = form.form;

  return (
    <FormPage
      title="Create Email Template"
      breadcrumbsKey="configuration.email-templates.new"
      form={form}
      onCancel={() => navigate('/configuration/email-templates')}
      aside={<VariablePicker />}
    >
      <FormPage.Section title="Template Details" columns={2}>
        <f.Field name="name">
          {field => (
            <BaseInput
              label="Template Name"
              isRequired
              placeholder="Ticket Created Notification"
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
            />
          )}
        </f.Field>

        <f.Field name="notificationType">
          {field => (
            <BaseSelect
              label="Notification Type"
              isRequired
              selectedKey={String(field.state.value)}
              onSelectionChange={key => {
                field.handleChange(Number(key) as NotificationType);
              }}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
            >
              {Object.entries(NOTIFICATION_TYPE_LABELS).map(([key, label]) => (
                <BaseSelectItem key={key} value={key}>{label}</BaseSelectItem>
              ))}
            </BaseSelect>
          )}
        </f.Field>

        <f.Field name="subject">
          {field => (
            <BaseInput
              label="Subject Line"
              isRequired
              placeholder="New Ticket Created: {{ticket.subject}}"
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
              description="Use Scriban syntax for variables (e.g., {{ticket.subject}})"
              className="md:col-span-2"
            />
          )}
        </f.Field>

        <f.Field name="isActive">
          {field => (
            <div className="flex items-center gap-2 md:col-span-2">
              <BaseToggle
                isSelected={field.state.value}
                onChange={field.handleChange}
              >
                Template is Active
              </BaseToggle>
            </div>
          )}
        </f.Field>
      </FormPage.Section>

      <FormPage.Section title="Email Body">
        <f.Field name="body">
          {field => (
            <BaseTextarea
              label="Email Body"
              isRequired
              placeholder="Hello {{user.requesterName}},&#10;&#10;Your ticket has been created..."
              value={field.state.value}
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
              description="Use Scriban syntax for variables"
              minRows={15}
              classNames={{
                input: 'font-mono text-sm',
              }}
            />
          )}
        </f.Field>
      </FormPage.Section>
    </FormPage>
  );
}

export default NewEmailTemplatePage;
