import { AppAuthSplash } from '@/components/AppSplash';
import { ProviderViewGuard } from '@/components/provider/ProviderViewGuard';
import { usePageTitle } from '@brainforgeau/components/page';
import {
  ProviderPermissions,
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
        hasPermission(ProviderPermissions.Support)
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
