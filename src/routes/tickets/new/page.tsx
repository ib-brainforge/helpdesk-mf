/**
 * /tickets/new: kept so old links and bookmarks still work.
 *
 * It used to be a second, older create form beside the New Request wizard.
 * There is one way to raise a ticket now, so this opens the Tickets list with
 * the wizard already open.
 */
import { AppAuthSplash } from '@/components/AppSplash';
import { withAuthenticationRequired } from '@/security';
import { Navigate } from '@modern-js/runtime/router';

function NewTicketRedirect() {
  return <Navigate to="/tickets?new=1" replace />;
}

export default withAuthenticationRequired(NewTicketRedirect, {
  OnRedirecting: () => <AppAuthSplash />,
});
