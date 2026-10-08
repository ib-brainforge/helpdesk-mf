import { AppAuthSplash } from '@/components/AppSplash';
import { TicketDetail } from '@/components/tickets';
import { TicketScopeProvider } from '@/components/tickets/components/TicketScopeProvider';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useParams } from '@modern-js/runtime/router';
import React from 'react';

function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  // Keyed by ticket, so opening another ticket resolves its company afresh.
  return (
    <TicketScopeProvider key={id} ticketId={id ?? ''}>
      <TicketDetail />
    </TicketScopeProvider>
  );
}

export default withAuthenticationRequired(TicketDetailPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
