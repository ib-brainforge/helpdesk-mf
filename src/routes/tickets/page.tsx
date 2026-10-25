/**
 * Tenant Tickets Page — single list of tenant-scoped tickets.
 *
 * The former 3-tab UI (My Tickets / Platform Tickets / Tenant Viewer) has been removed:
 * - Platform self-service tickets are now handled via the navbar widget (/v1/platform/my-tickets).
 * - The principal admin/agent console lives at /principal/{id}/tickets.
 * - The flat helpdesk.platform.manage role and Tenant Viewer have been deleted.
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
