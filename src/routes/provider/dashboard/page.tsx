import { AppAuthSplash } from '@/components/AppSplash';
import { ProviderViewGuard } from '@/components/provider/ProviderViewGuard';
import { HelpdeskPermissions } from '@/constants/permissions';
import TenantDashboardPage from '@/routes/dashboard/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

/** The Provider view's dashboard: the Tenant dashboard, in the provider's office. */
function ProviderDashboardPage() {
  return (
    <ProviderViewGuard requiredPermissions={[HelpdeskPermissions.Reports.Read]}>
      <TenantDashboardPage />
    </ProviderViewGuard>
  );
}

export default withAuthenticationRequired(ProviderDashboardPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
