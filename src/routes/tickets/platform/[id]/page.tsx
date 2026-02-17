/**
 * Platform ticket detail page
 *
 * Phase 2: Frontend Unification
 * Renders ticket detail with source='platform' for feature toggling
 */

import React from 'react';
import { PageSpinner } from '@brainforgeau/components/base';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useParams } from '@modern-js/runtime/router';
import { TicketDetail } from '@/components/tickets/components/TicketDetail';

function PlatformTicketDetailPage() {
  const { id } = useParams();

  if (!id) {
    return <div>Ticket ID not found</div>;
  }

  return <TicketDetail ticketId={id} source="platform" />;
}

export default withAuthenticationRequired(PlatformTicketDetailPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
