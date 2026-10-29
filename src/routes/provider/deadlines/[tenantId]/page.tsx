import { AppAuthSplash, AppLoadingSplash } from '@/components/AppSplash';
import { TenantDeadlinePage } from '@/components/company-deadlines/components/TenantDeadlinePage';
import { useCompanyDeadlinePolicy } from '@/components/company-deadlines/hooks/useCompanyDeadlines';
import { ProviderViewGuard } from '@/components/provider/ProviderViewGuard';
import { useScopeNames } from '@/hooks/useScopeNames';
import {
  ProviderPermissions,
  withAuthenticationRequired,
} from '@brainforgeau/security';
import { useLocation, useParams } from '@modern-js/runtime/router';
import React from 'react';

/** One tenant's deadlines, for provider staff: read, edit, revert to default. */
function TenantDeadlinesDetail() {
  const { tenantId = '' } = useParams<{ tenantId: string }>();
  const { data: policy, isLoading } = useCompanyDeadlinePolicy(tenantId);
  const { byTenantId } = useScopeNames();
  // The list passes the name along; a direct link falls back to the context names.
  const { state } = useLocation();
  const name =
    (state as { name?: string } | null)?.name ??
    byTenantId.get(tenantId)?.tenantName ??
    'Tenant';

  if (isLoading || !policy) return <AppLoadingSplash />;
  return (
    <TenantDeadlinePage
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
    <ProviderViewGuard requiredPermissions={[ProviderPermissions.Support]}>
      <TenantDeadlinesDetail />
    </ProviderViewGuard>
  );
}

export default withAuthenticationRequired(Page, {
  OnRedirecting: () => <AppAuthSplash />,
});
