import { AppLoading } from '@/components/AppLoading';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { Navigate } from '@modern-js/runtime/router';
import React from 'react';

function Page() {
  return <Navigate to="/dashboard" replace />;
}

export default withAuthenticationRequired(Page, {
  OnRedirecting: () => <AppLoading />,
  signinRedirectArgs: {
    redirect_uri: window.location.href,
  },
});
