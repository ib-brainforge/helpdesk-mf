import { AppAuthSplash } from '@/components/AppSplash';
import { HelpdeskPermissions } from '@/constants/permissions';
import { usePermissions, withAuthenticationRequired } from '@/security';
import { Navigate } from '@modern-js/runtime/router';
import React from 'react';

/**
 * The landing redirect. The dashboard is built from reports, which Customers,
 * Platform Support and Principal Agents cannot read, so they land on their
 * tickets instead of a page that would say Access Denied.
 */
function Page() {
  const { hasPermission, isLoading } = usePermissions();
  if (isLoading) return <AppAuthSplash />;
  return (
    <Navigate
      to={
        hasPermission(HelpdeskPermissions.Reports.Read)
          ? '/dashboard'
          : '/tickets'
      }
      replace
    />
  );
}

export default withAuthenticationRequired(Page, {
  OnRedirecting: () => <AppAuthSplash />,
  signinRedirectArgs: {
    redirect_uri: window.location.href,
  },
});
