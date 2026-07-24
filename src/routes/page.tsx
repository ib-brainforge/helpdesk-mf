import { AppAuthSplash } from '@/components/AppSplash';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { Navigate } from '@modern-js/runtime/router';
import React from 'react';

function Page() {
  return <Navigate to="/dashboard" replace />;
}

export default withAuthenticationRequired(Page, {
  OnRedirecting: () => <AppAuthSplash />,
  signinRedirectArgs: {
    redirect_uri: window.location.href,
  },
});
