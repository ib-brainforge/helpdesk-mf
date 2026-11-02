/**
 * Tickets Page — the list of the current tenant's own tickets.
 *
 * A provider's queue of tenant tickets is the Provider view's From tenants
 * page (/provider/tickets).
 */

import { AppAuthSplash } from '@/components/AppSplash';
import { TicketList } from '@/components/tickets/components/TicketList';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function TicketsPage() {
  return <TicketList />;
}

export default withAuthenticationRequired(TicketsPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
