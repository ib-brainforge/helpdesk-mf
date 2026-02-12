import React from 'react';
import { PageSpinner } from '@brainforgeau/components/base';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { TicketDetail } from '@/components/tickets';

function TicketDetailPage() {
  return <TicketDetail />;
}

export default withAuthenticationRequired(TicketDetailPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
