import React from 'react';
import { Navigate } from '@modern-js/runtime/router';
import { PageSpinner } from '@brainforgeau/components/base';
import { withAuthenticationRequired } from '@brainforgeau/security';

function Page() {
  return <Navigate to="/dashboard" replace />;
}

export default withAuthenticationRequired(Page, {
  OnRedirecting: () => <PageSpinner title="Redirecting..." />,
  signinRedirectArgs: {
    redirect_uri: window.location.href,
  },
});
