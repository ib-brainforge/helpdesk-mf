import { AppAuthSplash } from '@/components/AppSplash';
import { ProviderViewGuard } from '@/components/provider/ProviderViewGuard';
import { TicketDetail } from '@/components/tickets';
import {
  ProviderPermissions,
  withAuthenticationRequired,
} from '@brainforgeau/security';
import React from 'react';

/** A tenant's ticket in the provider's office, opened from From tenants. */
function ProviderTicketDetailPage() {
  return (
    <ProviderViewGuard requiredPermissions={[ProviderPermissions.Support]}>
      <TicketDetail basePath="/provider/tickets" />
    </ProviderViewGuard>
  );
}

export default withAuthenticationRequired(ProviderTicketDetailPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
