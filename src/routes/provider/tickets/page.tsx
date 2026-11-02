import { AppAuthSplash } from '@/components/AppSplash';
import { ProviderViewGuard } from '@/components/provider/ProviderViewGuard';
import { TicketList } from '@/components/tickets/components/TicketList';
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
  return (
    <ProviderViewGuard requiredPermissions={[ProviderPermissions.Support]}>
      <TicketList fromTenants />
    </ProviderViewGuard>
  );
}

export default withAuthenticationRequired(FromTenantsPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
