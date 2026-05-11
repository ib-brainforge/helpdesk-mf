import { TenantMailConfigForm } from '@/components/email-settings';
import { PageBody, PageHeader } from '@brainforgeau/components/page';
import { withAuthorizationRequired } from '@brainforgeau/security';

/**
 * Email Settings page — thin proxy to notification-backend /v1/tenant-mail-config.
 *
 * Stage 4 notification centralization moves outbound mail config from helpdesk
 * to notification-backend. This page renders the singleton tenant mail config
 * form. All API calls go to notification-backend via notificationApiClient.
 *
 * REVIEW: TenantMailConfigForm owns its own TanStack Form instance and Save
 * button. Lifting the form instance up to FormPage.form would require
 * refactoring the sub-component — deferred to a separate ticket.
 */
function EmailSettingsPage() {
  return (
    <PageBody>
      <PageHeader title="Email Settings" breadcrumbsKey="configuration.email" />
      <TenantMailConfigForm />
    </PageBody>
  );
}

export default withAuthorizationRequired(EmailSettingsPage, {
  requiredPermissions: ['Helpdesk.Settings.Manage'],
});
