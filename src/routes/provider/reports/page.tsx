import { AppAuthSplash } from '@/components/AppSplash';
import { ProviderViewGuard } from '@/components/provider/ProviderViewGuard';
import { HelpdeskPermissions } from '@/constants/permissions';
import TenantReportsPage from '@/routes/__sidebar/reports/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

/** The Provider view's reports: the Tenant reports, in the provider's office. */
function ProviderReportsPage() {
  return (
    <ProviderViewGuard requiredPermissions={[HelpdeskPermissions.Reports.Read]}>
      <TenantReportsPage />
    </ProviderViewGuard>
  );
}

export default withAuthenticationRequired(ProviderReportsPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
