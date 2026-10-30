import { AppAuthSplash } from '@/components/AppSplash';
import { ProviderViewGuard } from '@/components/provider/ProviderViewGuard';
import { TicketGrid } from '@/components/tickets/components/TicketGrid';
import { usePageTitle } from '@brainforgeau/components/page';
import {
  ProviderPermissions,
  withAuthenticationRequired,
} from '@brainforgeau/security';
import React from 'react';

/**
 * From tenants: the provider's support queue, the tickets in this office
 * that a tenant raised or forwarded. The Tenant ticket list, asking for that
 * queue.
 */
function FromTenantsPage() {
  usePageTitle('From tenants');
  return (
    <ProviderViewGuard requiredPermissions={[ProviderPermissions.Support]}>
      <div className="flex w-full min-h-0 flex-1 flex-col">
        <TicketGrid fromTenants />
      </div>
    </ProviderViewGuard>
  );
}

export default withAuthenticationRequired(FromTenantsPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
