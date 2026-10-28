import { AppAuthSplash } from '@/components/AppSplash';
import { ProviderViewGuard } from '@/components/provider/ProviderViewGuard';
import { HelpdeskPermissions } from '@/constants/permissions';
import { usePageTitle } from '@brainforgeau/components/page';
import {
  usePermissions,
  withAuthenticationRequired,
} from '@brainforgeau/security';
import { Navigate } from '@modern-js/runtime/router';
import React from 'react';

/**
 * The Provider view's landing redirect: From tenants for staff who work the
 * queue, the dashboard for those who only read reports.
 */
function Redirect() {
  const { hasPermission, isLoading } = usePermissions();
  if (isLoading) return <AppAuthSplash />;
  return (
    <Navigate
      to={
        hasPermission(HelpdeskPermissions.Provider.Support)
          ? '/provider/tickets'
          : '/provider/dashboard'
      }
      replace
    />
  );
}

function ProviderIndexPage() {
  usePageTitle('Provider');
  return (
    <ProviderViewGuard>
      <Redirect />
    </ProviderViewGuard>
  );
}

export default withAuthenticationRequired(ProviderIndexPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
