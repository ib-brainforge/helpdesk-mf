import { useState, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  BaseButton,
  BaseModal,
  BaseModalContent,
  BaseModalHeader,
  BaseModalBody,
  BaseModalFooter,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
} from '@brainforgeau/components';
import { Alert, addToast, Switch } from '@heroui/react';
import { MailServerApi, HelpdeskEmailDomainEnumsMailProtocol } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { MailServerConfigDto } from '@/types/email';
import { MailProtocol } from '@/types/email';

const mailServerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  protocol: z.nativeEnum(MailProtocol),
  inboundHost: z.string().min(1, 'Inbound host is required'),
  inboundPort: z.number().min(1).max(65535),
  outboundHost: z.string().min(1, 'Outbound host is required'),
  outboundPort: z.number().min(1).max(65535),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  useSsl: z.boolean(),
  isActive: z.boolean(),
  folder: z.string().optional(),
});

type MailServerFormData = z.infer<typeof mailServerSchema>;

interface MailServerEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mailServer?: MailServerConfigDto;
}

export const MailServerEditorModal = ({
  isOpen,
  onClose,
  mailServer,
}: MailServerEditorModalProps) => {
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!mailServer;

  const defaultValues: MailServerFormData = {
    name: mailServer?.name ?? '',
    protocol: mailServer?.protocol ?? MailProtocol.Imap,
    inboundHost: mailServer?.inboundHost ?? '',
    inboundPort: mailServer?.inboundPort ?? 993,
    outboundHost: mailServer?.outboundHost ?? '',
    outboundPort: mailServer?.outboundPort ?? 587,
    username: mailServer?.username ?? '',
    password: '',
    useSsl: mailServer?.useSsl ?? true,
    isActive: mailServer?.isActive ?? true,
    folder: mailServer?.folder ?? 'INBOX',
  };

  const form = useForm({
    defaultValues,
    validators: {
      onChange: mailServerSchema,
      onSubmit: mailServerSchema,
    },
    onSubmit: async ({ value }) => {
      await handleSubmit(value);
    },
  });

  // Reset form when mailServer changes
  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, mailServer]);

  const handleSubmit = async (data: MailServerFormData) => {
    setErrors([]);
    setIsSubmitting(true);

    try {
      const client = await createHelpdeskApiClient(MailServerApi);

      if (isEdit) {
        // REVIEW: Update endpoint not implemented yet in backend - would be v1/mail-servers/{id} PUT
        addToast({
          title: 'Feature not available',
          description: 'Update functionality not yet implemented - backend endpoint pending',
          severity: 'warning',
        });
        throw new Error('Update functionality not yet available - backend endpoint pending');
      } else {
        // Map frontend enum to backend enum
        const backendProtocol = data.protocol === MailProtocol.Imap
          ? HelpdeskEmailDomainEnumsMailProtocol.Imap
          : HelpdeskEmailDomainEnumsMailProtocol.Pop3;

        // Map form data to backend command structure
        await client.v1MailServersPost({
          name: data.name,
          inboundProtocol: backendProtocol,
          inboundHost: data.inboundHost,
          inboundPort: data.inboundPort,
          inboundUsername: data.username,
          inboundPassword: data.password,
          inboundUseSsl: data.useSsl,
          inboundFolder: data.folder,
          outboundHost: data.outboundHost,
          outboundPort: data.outboundPort,
          outboundUsername: data.username,
          outboundPassword: data.password,
          outboundUseSsl: data.useSsl,
        });
      }

      addToast({
        title: isEdit ? 'Mail server updated successfully' : 'Mail server created successfully',
        severity: 'success',
      });

      await queryClient.invalidateQueries({ queryKey: ['mail-servers'] });

      form.reset();
      onClose();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail || error?.message || 'Failed to save mail server';
      setErrors([errorMessage]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      setErrors([]);
      onClose();
    }
  };

  const formatFormErrors = (errors: any[]): string | undefined => {
    if (!errors || errors.length === 0) return undefined;
    return errors.map((e) => (typeof e === 'string' ? e : e.message || String(e))).join(', ');
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} size="3xl" scrollBehavior="inside">
      <BaseModalContent>
        <BaseModalHeader title={isEdit ? 'Edit Mail Server' : 'Create Mail Server'} onClose={handleClose} />

        <BaseModalBody>
          <form
            className="flex h-full flex-col"
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

            <div className="flex flex-col gap-4">
              {/* General Settings */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <form.Field name="name">
                  {(field) => (
                    <BaseInput
                      label="Name"
                      isRequired
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      errorMessage={formatFormErrors(field.state.meta.errors)}
                      isInvalid={field.state.meta.errors.length > 0}
                      placeholder="Primary Mail Server"
                    />
                  )}
                </form.Field>

                <form.Field name="protocol">
                  {(field) => (
                    <BaseSelect
                      label="Protocol"
                      isRequired
                      selectedKeys={[String(field.state.value)]}
                      onSelectionChange={(keys) => {
                        const value = Number(keys.currentKey);
                        field.handleChange(value);
                      }}
                      errorMessage={formatFormErrors(field.state.meta.errors)}
                      isInvalid={field.state.meta.errors.length > 0}
                    >
                      <BaseSelectItem key={String(MailProtocol.Imap)}>IMAP</BaseSelectItem>
                      <BaseSelectItem key={String(MailProtocol.Pop3)}>POP3</BaseSelectItem>
                    </BaseSelect>
                  )}
                </form.Field>
              </div>

              {/* Inbound Settings */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <h3 className="mb-3 text-sm font-semibold">Inbound Mail Server</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <form.Field name="inboundHost">
                    {(field) => (
                      <BaseInput
                        label="Host"
                        isRequired
                        name={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        errorMessage={formatFormErrors(field.state.meta.errors)}
                        isInvalid={field.state.meta.errors.length > 0}
                        placeholder="imap.example.com"
                      />
                    )}
                  </form.Field>

                  <form.Field name="inboundPort">
                    {(field) => (
                      <BaseInput
                        label="Port"
                        isRequired
                        type="number"
                        name={field.name}
                        value={String(field.state.value)}
                        onChange={(e) => field.handleChange(Number(e.target.value))}
                        errorMessage={formatFormErrors(field.state.meta.errors)}
                        isInvalid={field.state.meta.errors.length > 0}
                        placeholder="993"
                      />
                    )}
                  </form.Field>

                  <form.Field name="folder">
                    {(field) => (
                      <BaseInput
                        label="Folder"
                        name={field.name}
                        value={field.state.value ?? ''}
                        onChange={(e) => field.handleChange(e.target.value || undefined)}
                        placeholder="INBOX"
                      />
                    )}
                  </form.Field>
                </div>
              </div>

              {/* Outbound Settings */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <h3 className="mb-3 text-sm font-semibold">Outbound Mail Server</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <form.Field name="outboundHost">
                    {(field) => (
                      <BaseInput
                        label="Host"
                        isRequired
                        name={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        errorMessage={formatFormErrors(field.state.meta.errors)}
                        isInvalid={field.state.meta.errors.length > 0}
                        placeholder="smtp.example.com"
                      />
                    )}
                  </form.Field>

                  <form.Field name="outboundPort">
                    {(field) => (
                      <BaseInput
                        label="Port"
                        isRequired
                        type="number"
                        name={field.name}
                        value={String(field.state.value)}
                        onChange={(e) => field.handleChange(Number(e.target.value))}
                        errorMessage={formatFormErrors(field.state.meta.errors)}
                        isInvalid={field.state.meta.errors.length > 0}
                        placeholder="587"
                      />
                    )}
                  </form.Field>
                </div>
              </div>

              {/* Authentication */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <form.Field name="username">
                  {(field) => (
                    <BaseInput
                      label="Username"
                      isRequired
                      name={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      errorMessage={formatFormErrors(field.state.meta.errors)}
                      isInvalid={field.state.meta.errors.length > 0}
                      placeholder="support@example.com"
                    />
                  )}
                </form.Field>

                <form.Field name="password">
                  {(field) => (
                    <BaseInput
                      label={isEdit ? 'Password (leave blank to keep current)' : 'Password'}
                      isRequired={!isEdit}
                      type="password"
                      name={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      errorMessage={formatFormErrors(field.state.meta.errors)}
                      isInvalid={field.state.meta.errors.length > 0}
                      placeholder="••••••••"
                    />
                  )}
                </form.Field>
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <form.Field name="useSsl">
                  {(field) => (
                    <Switch
                      isSelected={field.state.value}
                      onValueChange={field.handleChange}
                    >
                      Use SSL
                    </Switch>
                  )}
                </form.Field>

                <form.Field name="isActive">
                  {(field) => (
                    <Switch
                      isSelected={field.state.value}
                      onValueChange={field.handleChange}
                    >
                      Is Active
                    </Switch>
                  )}
                </form.Field>
              </div>
            </div>
          </form>
        </BaseModalBody>

        <BaseModalFooter className="flex justify-between">
          <div className="flex items-center gap-2">
            <BaseButton
              variant="light"
              size="sm"
              onClick={handleClose}
              isDisabled={isSubmitting}
            >
              Cancel
            </BaseButton>
            <BaseButton
              color="primary"
              size="sm"
              isLoading={isSubmitting}
              onPress={() => form.handleSubmit()}
            >
              {isEdit ? 'Update' : 'Create'}
            </BaseButton>
          </div>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
