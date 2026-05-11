import { NewTicketForm } from '@/components/tickets';
import { PageSpinner } from '@brainforgeau/components/base';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function NewTicketPage() {
  return <NewTicketForm />;
}

export default withAuthenticationRequired(NewTicketPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
