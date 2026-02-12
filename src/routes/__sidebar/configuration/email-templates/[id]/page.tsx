import { useState, useEffect } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { useParams, useNavigate } from '@modern-js/runtime/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { BaseButton, BaseInput, BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import { Alert, addToast, Switch, Textarea } from '@heroui/react';
import { AppSettingsApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { VariablePicker, NOTIFICATION_TYPE_LABELS } from '@/components/email-templates';
import { NotificationType } from '@/types/email-template';
import type { EmailTemplateDto } from '@/types/email-template';

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  notificationType: z.nativeEnum(NotificationType),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  isActive: z.boolean(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

function EditEmailTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // REVIEW: Email templates are stored in AppSettings with category 'EmailTemplate'
  const { data: template, isLoading } = useQuery<EmailTemplateDto>({
    queryKey: ['email-template', id],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(AppSettingsApi);
      const { data: settings } = await client.v1AppSettingsGet(true, 'EmailTemplate');
      const setting = (settings || []).find((s: any) => s.id === id);

      if (!setting) {
        throw new Error('Template not found');
      }

      const templateData = typeof setting.value === 'string'
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

  const form = useForm({
    defaultValues: {
      name: template?.name ?? '',
      notificationType: template?.notificationType ?? NotificationType.TicketCreated,
      subject: template?.subject ?? '',
      body: template?.body ?? '',
      isActive: template?.isActive ?? true,
    } as TemplateFormData,
    validators: {
      onChange: templateSchema,
      onSubmit: templateSchema,
    },
    onSubmit: async ({ value }) => {
      await handleSubmit(value);
    },
  });

  // Update form when template loads
  useEffect(() => {
    if (template) {
      form.setFieldValue('name', template.name);
      form.setFieldValue('notificationType', template.notificationType);
      form.setFieldValue('subject', template.subject);
      form.setFieldValue('body', template.body);
      form.setFieldValue('isActive', template.isActive);
    }
  }, [template]);

  const updateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      // REVIEW: Email templates are stored in AppSettings with category 'EmailTemplate'
      const client = await createHelpdeskApiClient(AppSettingsApi);
      const templateData = {
        notificationType: data.notificationType,
        subject: data.subject,
        body: data.body,
      };
      await client.v1AppSettingsIdPut(id!, {
        key: data.name,
        value: JSON.stringify(templateData),
        category: 'EmailTemplate',
        isActive: data.isActive,
      } as any);
    },
    onSuccess: () => {
      addToast({ title: 'Email template updated successfully', severity: 'success' });
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      queryClient.invalidateQueries({ queryKey: ['email-template', id] });
      navigate('/configuration/email-templates');
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.detail || error?.message || 'Failed to update email template';
      setErrors([errorMessage]);
    },
  });

  const handleSubmit = async (data: TemplateFormData) => {
    setErrors([]);
    setIsSubmitting(true);

    try {
      await updateMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVariableSelect = (placeholder: string) => {
    // REVIEW: Could enhance this to insert at cursor position in the future
    console.log('Variable selected:', placeholder);
  };

  const formatFormErrors = (errors: any[]): string | undefined => {
    if (!errors || errors.length === 0) return undefined;
    return errors.map((e) => (typeof e === 'string' ? e : e.message || String(e))).join(', ');
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Loading template...</div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Edit Email Template - Configuration</title>
      </Helmet>

      <div className="mb-5">
        <div className="mb-5 items-start gap-5 lg:flex">
          <h1 className="text-gray mb-2 text-2xl font-semibold md:mb-0 dark:text-white">
            Edit Email Template
          </h1>
          <div className="flex shrink-0 justify-end gap-2.5 md:ml-auto">
            <BaseButton
              variant="light"
              onPress={() => navigate('/configuration/email-templates')}
            >
              Cancel
            </BaseButton>
            <BaseButton
              color="primary"
              isLoading={isSubmitting}
              onPress={() => form.handleSubmit()}
            >
              Save Changes
            </BaseButton>
          </div>
        </div>
      </div>

      <form
        className="flex h-full flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        {errors.length > 0 && (
          <Alert className="mb-4" color="danger" variant="flat">
            <div className="flex flex-col gap-1">
              {errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <form.Field name="name">
                  {(field) => (
                    <BaseInput
                      label="Template Name"
                      isRequired
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      errorMessage={formatFormErrors(field.state.meta.errors)}
                      isInvalid={field.state.meta.errors.length > 0}
                      placeholder="Ticket Created Notification"
                    />
                  )}
                </form.Field>

                <form.Field name="notificationType">
                  {(field) => (
                    <BaseSelect
                      label="Notification Type"
                      isRequired
                      selectedKeys={[String(field.state.value)]}
                      onSelectionChange={(keys) => {
                        const value = Number(keys.currentKey);
                        field.handleChange(value);
                      }}
                      errorMessage={formatFormErrors(field.state.meta.errors)}
                      isInvalid={field.state.meta.errors.length > 0}
                    >
                      {Object.entries(NOTIFICATION_TYPE_LABELS).map(([key, label]) => (
                        <BaseSelectItem key={key}>{label}</BaseSelectItem>
                      ))}
                    </BaseSelect>
                  )}
                </form.Field>
              </div>

              <form.Field name="subject">
                {(field) => (
                  <BaseInput
                    label="Subject Line"
                    isRequired
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    errorMessage={formatFormErrors(field.state.meta.errors)}
                    isInvalid={field.state.meta.errors.length > 0}
                    placeholder="New Ticket Created: {{ticket.subject}}"
                    description="Use Scriban syntax for variables (e.g., {{ticket.subject}})"
                  />
                )}
              </form.Field>

              <form.Field name="body">
                {(field) => (
                  <Textarea
                    label="Email Body"
                    isRequired
                    name={field.name}
                    value={field.state.value}
                    onValueChange={field.handleChange}
                    errorMessage={formatFormErrors(field.state.meta.errors)}
                    isInvalid={field.state.meta.errors.length > 0}
                    placeholder="Hello {{user.requesterName}},&#10;&#10;Your ticket has been created..."
                    description="Use Scriban syntax for variables"
                    minRows={15}
                    classNames={{
                      input: 'font-mono text-sm',
                    }}
                  />
                )}
              </form.Field>

              <form.Field name="isActive">
                {(field) => (
                  <Switch
                    isSelected={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    Template is Active
                  </Switch>
                )}
              </form.Field>
            </div>
          </div>

          <div className="lg:col-span-1">
            <VariablePicker onVariableSelect={handleVariableSelect} />
          </div>
        </div>
      </form>
    </>
  );
}

export default EditEmailTemplatePage;
