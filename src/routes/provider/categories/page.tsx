import { AppAuthSplash } from '@/components/AppSplash';
import { ProviderCategories } from '@/components/provider/ProviderCategories';
import { ProviderViewGuard } from '@/components/provider/ProviderViewGuard';
import { HelpdeskPermissions } from '@/constants/permissions';
import { PageBody, PageHeader } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

/**
 * Provider Categories: the preset categories customers raise requests under,
 * with each one's default assignee and open tickets.
 */
function ProviderCategoriesPage() {
  return (
    <ProviderViewGuard
      requiredPermissions={[HelpdeskPermissions.Provider.Support]}
    >
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
