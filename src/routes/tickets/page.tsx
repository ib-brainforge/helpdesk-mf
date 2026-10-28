/**
 * Tickets Page — the list of the current tenant's own tickets.
 *
 * A provider's queue of customer tickets is the Provider view's From customers
 * page (/provider/tickets).
 */

import { AppAuthSplash } from '@/components/AppSplash';
import { TicketGrid } from '@/components/tickets/components/TicketGrid';
import { usePageTitle } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function TicketsPage() {
  usePageTitle('Tickets');
  return (
    // TicketGrid sizes itself to the viewport below the shell's top block
    // (calc(100dvh - var(--bf-shell-top-offset, 55px))).
    <div className="flex w-full min-h-0 flex-1 flex-col">
      <TicketGrid />
    </div>
  );
}

export default withAuthenticationRequired(TicketsPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
