import { AppAuthSplash } from '@/components/AppSplash';
import { ProviderCategories } from '@/components/provider/ProviderCategories';
import { ProviderViewGuard } from '@/components/provider/ProviderViewGuard';
import { PageBody, PageHeader } from '@brainforgeau/components/page';
import {
  ProviderPermissions,
  withAuthenticationRequired,
} from '@brainforgeau/security';
import React from 'react';

/**
 * Provider Categories: the preset categories tenants raise requests under,
 * with each one's default assignee and open tickets.
 */
function ProviderCategoriesPage() {
  return (
    <ProviderViewGuard requiredPermissions={[ProviderPermissions.Support]}>
      <PageBody>
        <PageHeader
          title="Provider Categories"
          breadcrumbsKey="provider.categories"
        />
        <ProviderCategories />
      </PageBody>
    </ProviderViewGuard>
  );
}

export default withAuthenticationRequired(ProviderCategoriesPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
