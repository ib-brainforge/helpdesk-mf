import { AppAuthSplash, AppLoadingSplash } from '@/components/AppSplash';
import { CustomerDeadlinePage } from '@/components/company-deadlines/components/CustomerDeadlinePage';
import { useCompanyDeadlinePolicy } from '@/components/company-deadlines/hooks/useCompanyDeadlines';
import { ProviderViewGuard } from '@/components/provider/ProviderViewGuard';
import { HelpdeskPermissions } from '@/constants/permissions';
import { useScopeNames } from '@/hooks/useScopeNames';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useLocation, useParams } from '@modern-js/runtime/router';
import React from 'react';

/** One customer's deadlines, for provider staff: read, edit, revert to default. */
function CustomerDeadlinesDetail() {
  const { tenantId = '' } = useParams<{ tenantId: string }>();
  const { data: policy, isLoading } = useCompanyDeadlinePolicy(tenantId);
  const { byTenantId } = useScopeNames();
  // The list passes the name along; a direct link falls back to the context names.
  const { state } = useLocation();
  const name =
    (state as { name?: string } | null)?.name ??
    byTenantId.get(tenantId)?.tenantName ??
    'Customer';

  if (isLoading || !policy) return <AppLoadingSplash />;
  return (
    <CustomerDeadlinePage
      // A new page, never the last one's mode or draft.
      key={tenantId}
      tenantId={tenantId}
      name={name}
      policy={policy}
    />
  );
}

function Page() {
  return (
    <ProviderViewGuard
      requiredPermissions={[HelpdeskPermissions.Provider.Support]}
    >
      <CustomerDeadlinesDetail />
    </ProviderViewGuard>
  );
}

export default withAuthenticationRequired(Page, {
  OnRedirecting: () => <AppAuthSplash />,
});
