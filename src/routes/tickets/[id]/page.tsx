import { TicketDetail } from '@/components/tickets';
import { AuthSplash } from '@brainforgeau/components/base';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function TicketDetailPage() {
  return <TicketDetail />;
}

export default withAuthenticationRequired(TicketDetailPage, {
  OnRedirecting: () => <AuthSplash />,
});
