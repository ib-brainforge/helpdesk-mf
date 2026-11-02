/**
 * /provider/raised: kept so old links and bookmarks still work. "Raised with
 * our provider" is a preset of the one ticket list now.
 */
import { AppAuthSplash } from '@/components/AppSplash';
import { RAISED_WITH_PROVIDER_PATH } from '@/views';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { Navigate } from '@modern-js/runtime/router';

function RaisedWithProviderRedirect() {
  return <Navigate to={RAISED_WITH_PROVIDER_PATH} replace />;
}

export default withAuthenticationRequired(RaisedWithProviderRedirect, {
  OnRedirecting: () => <AppAuthSplash />,
});
