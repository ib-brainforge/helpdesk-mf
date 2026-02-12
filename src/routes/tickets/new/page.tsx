import React from 'react';
import { PageSpinner } from '@brainforgeau/components/base';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { NewTicketForm } from '@/components/tickets';

function NewTicketPage() {
  return <NewTicketForm />;
}

export default withAuthenticationRequired(NewTicketPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
