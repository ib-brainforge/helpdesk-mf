import { AppAuthSplash } from '@/components/AppSplash';
import { ProviderViewGuard } from '@/components/provider/ProviderViewGuard';
import { TicketDetail } from '@/components/tickets';
import { HelpdeskPermissions } from '@/constants/permissions';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

/** A customer's ticket in the provider's office, opened from From customers. */
function ProviderTicketDetailPage() {
  return (
    <ProviderViewGuard
      requiredPermissions={[HelpdeskPermissions.Provider.Support]}
    >
      <TicketDetail basePath="/provider/tickets" />
    </ProviderViewGuard>
  );
}

export default withAuthenticationRequired(ProviderTicketDetailPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
