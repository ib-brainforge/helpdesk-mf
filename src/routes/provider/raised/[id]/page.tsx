/**
 * /provider/raised/:id: where notification emails about a ticket handled
 * above the tenant still point. The ticket's page is in the one list now.
 */
import { AppAuthSplash } from '@/components/AppSplash';
import { ticketPath } from '@/components/tickets/handled-above';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { Navigate, useParams } from '@modern-js/runtime/router';

function RaisedTicketRedirect() {
  const { id = '' } = useParams<{ id: string }>();
  return <Navigate to={ticketPath(id, true)} replace />;
}

export default withAuthenticationRequired(RaisedTicketRedirect, {
  OnRedirecting: () => <AppAuthSplash />,
});
