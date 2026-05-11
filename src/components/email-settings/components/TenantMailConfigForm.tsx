import {
  getTenantMailConfig,
  testTenantMailConfig,
  upsertTenantMailConfig,
} from '@/state/notificationApiClient';
import {
  OutboundMailProtocol,
  type TenantMailConfigDto,
  type TenantMailConfigTestResult,
} from '@/types/email';
import {
  BaseButton,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  Icon,
  ValidationAlert,
} from '@brainforgeau/components';
import { Card, CardContent, Spinner, Switch, toast } from '@heroui/react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';

const QUERY_KEY = ['tenant-mail-config'] as const;

// Validation — only enforce host/port/username when SMTP + enabled
const tenantMailConfigSchema = z.object({
  isEnabled: z.boolean(),
  outboundProtocol: z.nativeEnum(OutboundMailProtocol),
  outboundHost: z.string().nullable(),
  outboundPort: z.number().min(1).max(65535).nullable(),
  username: z.string().nullable(),
  /** Plaintext — null means "keep existing password" on update */
  password: z.string().nullable(),
  useSsl: z.boolean(),
  fromEmail: z
    .string()
    .email('Must be a valid email')
    .nullable()
    .or(z.literal('')),
  fromName: z.string().nullable(),
});

type FormValues = z.infer<typeof tenantMailConfigSchema>;

function buildDefaultValues(dto: TenantMailConfigDto | undefined): FormValues {
  return {
    isEnabled: dto?.isEnabled ?? false,
    outboundProtocol: dto?.outboundProtocol ?? OutboundMailProtocol.Smtp,
    outboundHost: dto?.outboundHost ?? null,
    outboundPort: dto?.outboundPort ?? 587,
    username: dto?.username ?? null,
    password: null, // never pre-fill password
    useSsl: dto?.useSsl ?? true,
    fromEmail: dto?.fromEmail ?? null,
    fromName: dto?.fromName ?? null,
  };
}

function formatFormErrors(errors: any[]): string | undefined {
  if (!errors || errors.length === 0) return undefined;
  return errors
    .map(e => (typeof e === 'string' ? e : e.message || String(e)))
    .join(', ');
}

export function TenantMailConfigForm() {
  const queryClient = useQueryClient();
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [testResult, setTestResult] =
    useState<TenantMailConfigTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const { data: dto, isLoading } = useQuery<TenantMailConfigDto>({
    queryKey: QUERY_KEY,
    queryFn: getTenantMailConfig,
  });

  const saveMutation = useMutation({
    mutationFn: upsertTenantMailConfig,
    onSuccess: updated => {
      queryClient.setQueryData(QUERY_KEY, updated);
      toast('Email settings saved', { variant: 'success' });
      form.reset(buildDefaultValues(updated));
      setSubmitErrors([]);
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.detail ||
        error?.message ||
        'Failed to save settings';
      setSubmitErrors([msg]);
    },
  });

  const form = useForm({
    defaultValues: buildDefaultValues(dto),
    validators: {
      onChange: tenantMailConfigSchema,
      onSubmit: tenantMailConfigSchema,
    },
    onSubmit: async ({ value }) => {
      await saveMutation.mutateAsync({
        isEnabled: value.isEnabled,
        outboundProtocol: value.outboundProtocol,
        outboundHost: value.outboundHost || null,
        outboundPort: value.outboundPort,
        username: value.username || null,
        // null = keep existing password; empty string = clear (send null)
        password: value.password || null,
        useSsl: value.useSsl,
        fromEmail: value.fromEmail || null,
        fromName: value.fromName || null,
      });
    },
  });

  const handleTest = async () => {
    const values = form.state.values;
    if (!values.outboundHost || !values.outboundPort) {
      toast('Enter host and port before testing', { variant: 'warning' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testTenantMailConfig({
        outboundHost: values.outboundHost,
        outboundPort: values.outboundPort,
        username: values.username || null,
        // Use form password if filled, otherwise indicate existing (backend uses stored)
        password: values.password || null,
        useSsl: values.useSsl,
      });
      setTestResult(result);
      if (result.success) {
        toast(
          `Connection successful${result.latencyMs != null ? ` — ${result.latencyMs}ms` : ''}`,
          { variant: 'success' },
        );
      } else {
        toast('Connection failed', {
          description: result.error ?? 'Unknown error',
          variant: 'danger',
        });
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.detail || error?.message || 'Test failed';
      toast('Test failed', { description: msg, variant: 'danger' });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-default-500">
        <Spinner size="sm" />
        <span>Loading email settings...</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="max-w-2xl space-y-6"
    >
      <ValidationAlert
        errors={submitErrors}
        onClose={() => setSubmitErrors([])}
      />

      {/* Enable / Protocol */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold">Outbound mail server</h2>

          <div className="flex items-center gap-6">
            <form.Field name="isEnabled">
              {field => (
                <Switch
                  isSelected={field.state.value}
                  onChange={field.handleChange}
                >
                  Enable custom outbound mail
                </Switch>
              )}
            </form.Field>
          </div>

          <form.Field name="outboundProtocol">
            {field => (
              <BaseSelect
                label="Protocol"
                className="max-w-xs"
                selectedKey={String(field.state.value)}
                onSelectionChange={keys =>
                  field.handleChange(Number(keys) as OutboundMailProtocol)
                }
                errorMessage={formatFormErrors(field.state.meta.errors)}
                isInvalid={field.state.meta.errors.length > 0}
              >
                <BaseSelectItem key={String(OutboundMailProtocol.Smtp)}>
                  SMTP
                </BaseSelectItem>
                <BaseSelectItem key={String(OutboundMailProtocol.SendGrid)}>
                  SendGrid
                </BaseSelectItem>
              </BaseSelect>
            )}
          </form.Field>
        </CardContent>
      </Card>

      {/* Server */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold">Server settings</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <form.Field name="outboundHost">
              {field => (
                <BaseInput
                  label="Host"
                  className="md:col-span-2"
                  name={field.name}
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value || null)}
                  errorMessage={formatFormErrors(field.state.meta.errors)}
                  isInvalid={field.state.meta.errors.length > 0}
                  placeholder="smtp.example.com"
                />
              )}
            </form.Field>

            <form.Field name="outboundPort">
              {field => (
                <BaseInput
                  label="Port"
                  type="number"
                  name={field.name}
                  value={
                    field.state.value != null ? String(field.state.value) : ''
                  }
                  onBlur={field.handleBlur}
                  onChange={e =>
                    field.handleChange(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  errorMessage={formatFormErrors(field.state.meta.errors)}
                  isInvalid={field.state.meta.errors.length > 0}
                  placeholder="587"
                />
              )}
            </form.Field>
          </div>

          <form.Field name="useSsl">
            {field => (
              <Switch
                isSelected={field.state.value}
                onChange={field.handleChange}
              >
                Use SSL / TLS
              </Switch>
            )}
          </form.Field>
        </CardContent>
      </Card>

      {/* Credentials */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold">Credentials</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <form.Field name="username">
              {field => (
                <BaseInput
                  label="Username"
                  name={field.name}
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value || null)}
                  errorMessage={formatFormErrors(field.state.meta.errors)}
                  isInvalid={field.state.meta.errors.length > 0}
                  placeholder="support@example.com"
                />
              )}
            </form.Field>

            <form.Field name="password">
              {field => (
                <BaseInput
                  label={
                    dto?.hasPassword
                      ? 'Password (leave blank to keep current)'
                      : 'Password'
                  }
                  type="password"
                  name={field.name}
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value || null)}
                  errorMessage={formatFormErrors(field.state.meta.errors)}
                  isInvalid={field.state.meta.errors.length > 0}
                  placeholder="••••••••"
                  description={
                    dto?.hasPassword
                      ? 'A password is currently stored.'
                      : undefined
                  }
                />
              )}
            </form.Field>
          </div>
        </CardContent>
      </Card>

      {/* Sender identity */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold">Sender identity</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <form.Field name="fromEmail">
              {field => (
                <BaseInput
                  label="From email"
                  type="email"
                  name={field.name}
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value || null)}
                  errorMessage={formatFormErrors(field.state.meta.errors)}
                  isInvalid={field.state.meta.errors.length > 0}
                  placeholder="helpdesk@example.com"
                />
              )}
            </form.Field>

            <form.Field name="fromName">
              {field => (
                <BaseInput
                  label="From name"
                  name={field.name}
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value || null)}
                  errorMessage={formatFormErrors(field.state.meta.errors)}
                  isInvalid={field.state.meta.errors.length > 0}
                  placeholder="Helpdesk Support"
                />
              )}
            </form.Field>
          </div>
        </CardContent>
      </Card>

      {/* Test result banner */}
      {testResult && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            testResult.success
              ? 'border-success-200 bg-success-50 text-success-700'
              : 'border-danger-200 bg-danger-50 text-danger-700'
          }`}
        >
          <Icon
            name={testResult.success ? 'check-circle' : 'x-circle'}
            className="h-4 w-4 flex-shrink-0"
          />
          <span>
            {testResult.success
              ? `Connection successful${testResult.latencyMs != null ? ` — ${testResult.latencyMs}ms` : ''}`
              : (testResult.error ?? 'Connection failed')}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <BaseButton
          color="primary"
          type="submit"
          isDisabled={saveMutation.isPending}
        >
          Save settings
        </BaseButton>

        <BaseButton
          variant="bordered"
          type="button"
          isDisabled={isTesting || saveMutation.isPending}
          onPress={handleTest}
          icon={<Icon name="signal" className="h-4 w-4" />}
        >
          Test connection
        </BaseButton>
      </div>
    </form>
  );
}
