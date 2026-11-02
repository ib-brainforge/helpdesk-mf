/**
 * Tickets Page — the list of the current tenant's own tickets.
 *
 * A provider's queue of tenant tickets is the Provider view's From tenants
 * page (/provider/tickets).
 */

import { AppAuthSplash } from '@/components/AppSplash';
import { TicketGrid } from '@/components/tickets/components/TicketGrid';
import { usePageTitle } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useSearchParams } from '@modern-js/runtime/router';
import React from 'react';

function TicketsPage() {
  usePageTitle('Tickets');
  const [searchParams] = useSearchParams();
  const raisedPreset = searchParams.get('raised') === '1';
  return (
    // TicketGrid sizes itself to the viewport below the shell's top block
    // (calc(100dvh - var(--bf-shell-top-offset, 55px))).
    <div className="flex w-full min-h-0 flex-1 flex-col">
      {/*
        Keyed on the "Raised with our provider" preset: the grid seeds its
        filters from the URL once, so moving into or out of the preset (the
        side menu, Show all tickets) starts it afresh.
      */}
      <TicketGrid key={raisedPreset ? 'raised' : 'all'} />
    </div>
  );
}

export default withAuthenticationRequired(TicketsPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
