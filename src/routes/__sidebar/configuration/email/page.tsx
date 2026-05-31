/**
 * Email Settings page — thin proxy to notification-backend /v1/tenant-mail-config.
 *
 * Stage 4 notification centralization moves outbound mail config from helpdesk
 * to notification-backend. This page renders the singleton tenant mail config
 * form. All API calls go to notification-backend via notificationApiClient.
 *
 * W1-review-fixes: Form instance lifted to page level via useEntityForm.
 * TenantMailConfigForm is now a presentational component receiving form + dto.
 * Page is wrapped in <FormPage> so Save/Reset appear in the PageHeader.Actions slot.
 *
 * NOTE: The "Test connection" button is kept inside TenantMailConfigForm because it
 * reads form values directly (not a save action) and is specific to the SMTP panel UI.
 */

import {
  getTenantMailConfig,
  upsertTenantMailConfig,
} from '@/state/notificationApiClient';
import type { TenantMailConfigDto } from '@/types/email';
import {
  TenantMailConfigForm,
  tenantMailConfigSchema,
} from '@/components/email-settings';
import { OutboundMailProtocol } from '@/types/email';
import { Icon, PageSpinner } from '@brainforgeau/components';
import { FormPage, useEntityForm } from '@brainforgeau/components/page';
import { withAuthorizationRequired } from '@brainforgeau/security';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

const QUERY_KEY = ['tenant-mail-config'] as const;

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

function EmailSettingsPage() {
  const queryClient = useQueryClient();
  const {
    data: dto,
    isLoading,
    error,
  } = useQuery<TenantMailConfigDto>({
    queryKey: QUERY_KEY,
    queryFn: getTenantMailConfig,
  });

  const form = useEntityForm<typeof tenantMailConfigSchema>({
    schema: tenantMailConfigSchema,
    defaultValues: buildDefaultValues(undefined),
    // values resets the form whenever the dto loads from the server
    values: dto !== undefined ? buildDefaultValues(dto) : undefined,
    onSubmit: async (values: FormValues) => {
      const updated = await upsertTenantMailConfig({
        isEnabled: values.isEnabled,
        outboundProtocol: values.outboundProtocol,
        outboundHost: values.outboundHost || null,
        outboundPort: values.outboundPort,
        username: values.username || null,
        // null = keep existing password; falsy string → clear
        password: values.password || null,
        useSsl: values.useSsl,
        fromEmail: values.fromEmail || null,
        fromName: values.fromName || null,
      });
      queryClient.setQueryData(QUERY_KEY, updated);
    },
    invalidateQueryKeys: [QUERY_KEY],
    toast: { success: 'Email settings saved', error: 'Failed to save settings' },
  });

  if (isLoading) {
    return <PageSpinner title="Loading email settings..." />;
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <Icon name="exclamation-circle" className="mx-auto h-12 w-12 text-warning-400" />
        <p className="text-xl font-semibold">Email settings unavailable</p>
        <p className="text-sm text-default-500">
          The notification service is not reachable or not configured.
        </p>
      </div>
    );
  }

  return (
    <FormPage
      title="Email Settings"
      breadcrumbsKey="configuration.email"
      form={form}
    >
      <TenantMailConfigForm form={form} dto={dto} />
    </FormPage>
  );
}

export default withAuthorizationRequired(EmailSettingsPage, {
  requiredPermissions: ['Helpdesk.Settings.Manage'],
});
