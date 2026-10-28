import { AppAuthSplash } from '@/components/AppSplash';
import { TenantDeadlineList } from '@/components/company-deadlines/components/TenantDeadlineList';
import { useTenantDeadlines } from '@/components/company-deadlines/hooks/useCompanyDeadlines';
import { ProviderViewGuard } from '@/components/provider/ProviderViewGuard';
import { HelpdeskPermissions } from '@/constants/permissions';
import { useListParams } from '@/hooks/useListParams';
import { PageBody, PageHeader } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

const FLAGS = ['custom', 'hasLate'] as const;
const SORTS = ['name', 'open', 'late'] as const;

/**
 * Tenant Deadlines: the tenants a provider supports. Pick one to read or
 * change its deadlines; a tenant without its own uses the Provider default.
 */
function TenantDeadlinesPage() {
  const list = useListParams({
    flags: FLAGS,
    sorts: SORTS,
    defaultSort: 'name',
  });
  const { params } = list;
  const tenants = useTenantDeadlines({
    search: params.search,
    custom: params.flags.custom,
    hasLate: params.flags.hasLate,
    sort: params.sort,
    dir: params.dir,
    page: params.page,
    pageSize: params.pageSize,
  });

  return (
    <PageBody>
      <PageHeader
        title="Tenant Deadlines"
        breadcrumbsKey="provider.deadlines.list"
      />
      <TenantDeadlineList list={list} query={tenants} />
    </PageBody>
  );
}

function Page() {
  return (
    <ProviderViewGuard
      requiredPermissions={[HelpdeskPermissions.Provider.Support]}
    >
      <TenantDeadlinesPage />
    </ProviderViewGuard>
  );
}

export default withAuthenticationRequired(Page, {
  OnRedirecting: () => <AppAuthSplash />,
});
