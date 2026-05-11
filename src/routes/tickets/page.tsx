/**
 * Tenant Tickets Page — single list of tenant-scoped tickets.
 *
 * The former 3-tab UI (My Tickets / Platform Tickets / Tenant Viewer) has been removed:
 * - Platform self-service tickets are now handled via the navbar widget (/v1/platform/my-tickets).
 * - The principal admin/agent console lives at /principal/{id}/tickets.
 * - The flat helpdesk.platform.manage role and Tenant Viewer have been deleted.
 */

import { TicketGrid } from '@/components/tickets/components/TicketGrid';
import { PageSpinner } from '@brainforgeau/components/base';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function TicketsPage() {
  return (
    <div className="flex flex-col h-full">
      <TicketGrid />
    </div>
  );
}

export default withAuthenticationRequired(TicketsPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
