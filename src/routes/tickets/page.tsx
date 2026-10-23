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
    // `flex-1 min-h-0`, not `h-full`: `h-full` resolved against a parent with
    // no definite height and collapsed to auto.
    //
    // This alone does NOT bound the page — measured in the browser, the whole
    // ancestor chain (html > body > div#root > div.flex.flex-1) is plain block
    // boxes sized by their content, so there is no height for `flex-1` to
    // divide up. TicketGrid measures its own viewport height for that reason;
    // see the comment on its useLayoutEffect. This keeps the wrapper from
    // adding a second, conflicting sizing rule on top of it.
    <div className="flex w-full min-h-0 flex-1 flex-col">
      <TicketGrid />
    </div>
  );
}

export default withAuthenticationRequired(TicketsPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
