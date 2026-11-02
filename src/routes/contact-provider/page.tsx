/**
 * /contact-provider: linked from other apps' help widgets and relationship
 * pages. There is one way to raise a request, the New Request wizard, whose
 * categories include the provider's and Netcorp's.
 */
import { AppAuthSplash } from '@/components/AppSplash';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { Navigate } from '@modern-js/runtime/router';

function ContactProviderRedirect() {
  return <Navigate to="/tickets/new" replace />;
}

export default withAuthenticationRequired(ContactProviderRedirect, {
  OnRedirecting: () => <AppAuthSplash />,
});
