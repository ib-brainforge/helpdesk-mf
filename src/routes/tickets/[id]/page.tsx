import { AppAuthSplash } from '@/components/AppSplash';
import { TicketDetail } from '@/components/tickets';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function TicketDetailPage() {
  return <TicketDetail />;
}

export default withAuthenticationRequired(TicketDetailPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
