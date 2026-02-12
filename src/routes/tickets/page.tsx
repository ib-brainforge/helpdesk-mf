import React from 'react';
import { PageSpinner } from '@brainforgeau/components/base';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { TicketGrid } from '@/components/tickets';

function TicketsPage() {
  return <TicketGrid />;
}

export default withAuthenticationRequired(TicketsPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
