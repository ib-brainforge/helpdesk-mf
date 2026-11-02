import { AppAuthSplash } from '@/components/AppSplash';
import { ProviderViewGuard } from '@/components/provider/ProviderViewGuard';
import { TenantDeadlineList } from '@/components/tenant-deadlines/components/TenantDeadlineList';
import {
  ProviderPermissions,
  withAuthenticationRequired,
} from '@brainforgeau/security';
import React from 'react';

/**
 * Tenant Deadlines: the tenants a provider supports. Pick one to read or
 * change its deadlines; a tenant without its own uses the Provider default.
 */
function Page() {
  return (
    <ProviderViewGuard requiredPermissions={[ProviderPermissions.Support]}>
      <TenantDeadlineList />
    </ProviderViewGuard>
  );
}

export default withAuthenticationRequired(Page, {
  OnRedirecting: () => <AppAuthSplash />,
});
