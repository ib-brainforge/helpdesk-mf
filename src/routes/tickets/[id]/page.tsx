import { TicketDetail } from '@/components/tickets';
import { PageSpinner } from '@brainforgeau/components/base';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function TicketDetailPage() {
  return <TicketDetail />;
}

export default withAuthenticationRequired(TicketDetailPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
