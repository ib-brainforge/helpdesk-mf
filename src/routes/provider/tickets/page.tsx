import { AppAuthSplash } from '@/components/AppSplash';
import { ProviderViewGuard } from '@/components/provider/ProviderViewGuard';
import { TicketGrid } from '@/components/tickets/components/TicketGrid';
import { HelpdeskPermissions } from '@/constants/permissions';
import { usePageTitle } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

/**
 * From customers: the provider's support queue, the tickets in this office
 * that a customer raised or forwarded. The Tenant ticket list, asking for that
 * queue.
 */
function FromCustomersPage() {
  usePageTitle('From customers');
  return (
    <ProviderViewGuard
      requiredPermissions={[HelpdeskPermissions.Provider.Support]}
    >
      <div className="flex w-full min-h-0 flex-1 flex-col">
        <TicketGrid fromCustomers />
      </div>
    </ProviderViewGuard>
  );
}

export default withAuthenticationRequired(FromCustomersPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
