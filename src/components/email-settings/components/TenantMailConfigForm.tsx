/**
 * TenantMailConfigForm — presentational form component for outbound mail config.
 *
 * W1-review-fixes: Refactored from a self-contained form to a controlled presentational
 * component. The form instance is owned by the parent page (EmailSettingsPage) via
 * useEntityForm. This component receives `form` and `dto` as props.
 *
 * The "Test connection" button reads form values directly and is kept here because
 * it is a panel-specific action (not a save), tied to the SMTP config UI.
 *
 * Exports `tenantMailConfigSchema` for use by the page-level useEntityForm call.
 */

import { testTenantMailConfig } from '@/state/notificationApiClient';
import {
  OutboundMailProtocol,
  type TenantMailConfigDto,
  type TenantMailConfigTestResult,
} from '@/types/email';
import {
  BaseButton,
  BaseCard,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  Icon,
} from '@brainforgeau/components';
import type { EntityFormInstance } from '@brainforgeau/components/page';
import { Card, CardContent, Switch, toast } from '@heroui/react';
import { useState } from 'react';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema — exported so the page can create a useEntityForm from it
// ---------------------------------------------------------------------------

export const tenantMailConfigSchema = z.object({
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

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function formatFormErrors(errors: unknown[]): string | undefined {
  if (!errors || errors.length === 0) return undefined;
  return errors
    .map((e) =>
      typeof e === 'string'
        ? e
        : (e as { message?: string }).message || String(e)
    )
    .join(', ');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface TenantMailConfigFormProps {
  /** The entity form instance owned by the parent page via useEntityForm. */
  form: EntityFormInstance<typeof tenantMailConfigSchema>;
  /** Current persisted DTO — used to show "password already set" hint. */
  dto: TenantMailConfigDto | undefined;
}

export function TenantMailConfigForm({ form, dto }: TenantMailConfigFormProps) {
  const [testResult, setTestResult] =
    useState<TenantMailConfigTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const f = form.form;

  const handleTest = async () => {
    const values = f.state.values as FormValues;
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
        password: values.password || null,
        useSsl: values.useSsl,
      });
      setTestResult(result);
      if (result.success) {
        toast(
          `Connection successful${result.latencyMs != null ? ` — ${result.latencyMs}ms` : ''}`,
          { variant: 'success' }
        );
      } else {
        toast('Connection failed', {
          description: result.error ?? 'Unknown error',
          variant: 'danger',
        });
      }
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      const msg = err?.response?.data?.detail || err?.message || 'Test failed';
      toast('Test failed', { description: msg, variant: 'danger' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Enable / Protocol */}
      <BaseCard>
        <h2 className="text-base font-semibold">Outbound mail server</h2>

        <div className="flex items-center gap-6">
          <f.Field name="isEnabled">
            {(field) => (
              <Switch
                isSelected={field.state.value}
                onChange={field.handleChange}
              >
                Enable custom outbound mail
              </Switch>
            )}
          </f.Field>
        </div>

        <f.Field name="outboundProtocol">
          {(field) => (
            <BaseSelect
              label="Protocol"
              className="max-w-xs"
              selectedKey={String(field.state.value)}
              onSelectionChange={(keys) =>
                field.handleChange(Number(keys) as OutboundMailProtocol)
              }
              errorMessage={formatFormErrors(field.state.meta.errors)}
              isInvalid={field.state.meta.errors.length > 0}
            >
              <BaseSelectItem
                key={String(OutboundMailProtocol.Smtp)}
                value={String(OutboundMailProtocol.Smtp)}
              >
                SMTP
              </BaseSelectItem>
              <BaseSelectItem
                key={String(OutboundMailProtocol.SendGrid)}
                value={String(OutboundMailProtocol.SendGrid)}
              >
                SendGrid
              </BaseSelectItem>
            </BaseSelect>
          )}
        </f.Field>
      </BaseCard>

      {/* Server */}
      <BaseCard>
        <h2 className="text-base font-semibold">Server settings</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <f.Field name="outboundHost">
            {(field) => (
              <BaseInput
                label="Host"
                className="md:col-span-2"
                name={field.name}
                value={field.state.value ?? ''}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value || null)}
                errorMessage={formatFormErrors(field.state.meta.errors)}
                isInvalid={field.state.meta.errors.length > 0}
                placeholder="smtp.example.com"
              />
            )}
          </f.Field>

          <f.Field name="outboundPort">
            {(field) => (
              <BaseInput
                label="Port"
                type="number"
                name={field.name}
                value={
                  field.state.value != null ? String(field.state.value) : ''
                }
                onBlur={field.handleBlur}
                onChange={(e) =>
                  field.handleChange(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                errorMessage={formatFormErrors(field.state.meta.errors)}
                isInvalid={field.state.meta.errors.length > 0}
                placeholder="587"
              />
            )}
          </f.Field>
        </div>

        <f.Field name="useSsl">
          {(field) => (
            <Switch
              isSelected={field.state.value}
              onChange={field.handleChange}
            >
              Use SSL / TLS
            </Switch>
          )}
        </f.Field>
      </BaseCard>

      {/* Credentials */}
      <BaseCard>
        <h2 className="text-base font-semibold">Credentials</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <f.Field name="username">
            {(field) => (
              <BaseInput
                label="Username"
                name={field.name}
                value={field.state.value ?? ''}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value || null)}
                errorMessage={formatFormErrors(field.state.meta.errors)}
                isInvalid={field.state.meta.errors.length > 0}
                placeholder="support@example.com"
              />
            )}
          </f.Field>

          <f.Field name="password">
            {(field) => (
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
                onChange={(e) => field.handleChange(e.target.value || null)}
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
          </f.Field>
        </div>
      </BaseCard>

      {/* Sender identity */}
      <BaseCard>
        <h2 className="text-base font-semibold">Sender identity</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <f.Field name="fromEmail">
            {(field) => (
              <BaseInput
                label="From email"
                type="email"
                name={field.name}
                value={field.state.value ?? ''}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value || null)}
                errorMessage={formatFormErrors(field.state.meta.errors)}
                isInvalid={field.state.meta.errors.length > 0}
                placeholder="helpdesk@example.com"
              />
            )}
          </f.Field>

          <f.Field name="fromName">
            {(field) => (
              <BaseInput
                label="From name"
                name={field.name}
                value={field.state.value ?? ''}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value || null)}
                errorMessage={formatFormErrors(field.state.meta.errors)}
                isInvalid={field.state.meta.errors.length > 0}
                placeholder="Helpdesk Support"
              />
            )}
          </f.Field>
        </div>
      </BaseCard>

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

      {/* Test connection — standalone action, not part of Save/Reset flow */}
      <div className="flex items-center gap-3">
        <BaseButton
          variant="bordered"
          type="button"
          isDisabled={isTesting || form.isSubmitting}
          onPress={handleTest}
          icon={<Icon name="signal" className="h-4 w-4" />}
        >
          Test connection
        </BaseButton>
      </div>
    </div>
  );
}
