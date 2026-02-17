import React from 'react';
import { PageSpinner } from '@brainforgeau/components/base';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { PlatformTicketDetail } from '@/components/admin/platform-tickets/PlatformTicketDetail';

function PlatformTicketDetailPage() {
  return <PlatformTicketDetail />;
}

export default withAuthenticationRequired(PlatformTicketDetailPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
