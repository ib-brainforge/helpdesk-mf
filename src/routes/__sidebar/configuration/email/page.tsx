import { Helmet } from '@modern-js/runtime/head';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { TenantMailConfigForm } from '@/components/email-settings';

/**
 * Email Settings page — thin proxy to notification-backend /v1/tenant-mail-config.
 *
 * Stage 4 notification centralization moves outbound mail config from helpdesk
 * to notification-backend. This page renders the singleton tenant mail config
 * form. All API calls go to notification-backend via notificationApiClient.
 */
function EmailSettingsPage() {
  return (
    <>
      <Helmet>
        <title>Email Settings - Configuration</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Administration', href: '/admin/settings' },
            { label: 'Email Settings', href: '/configuration/email', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Email Settings</h1>
        <p className="text-default-500 mt-1">
          Configure the outbound mail server used to send notifications and ticket emails.
        </p>
      </div>

      <TenantMailConfigForm />
    </>
  );
}

export default EmailSettingsPage;
