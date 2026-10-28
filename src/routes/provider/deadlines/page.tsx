import { AppAuthSplash } from '@/components/AppSplash';
import { CustomerDeadlineList } from '@/components/company-deadlines/components/CustomerDeadlineList';
import { useCustomerDeadlines } from '@/components/company-deadlines/hooks/useCompanyDeadlines';
import { ProviderViewGuard } from '@/components/provider/ProviderViewGuard';
import { HelpdeskPermissions } from '@/constants/permissions';
import { useListParams } from '@/hooks/useListParams';
import { PageBody, PageHeader } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

const FLAGS = ['custom', 'hasLate'] as const;
const SORTS = ['name', 'open', 'late'] as const;

/**
 * Customer Deadlines: the customers a provider supports. Pick one to read or
 * change its deadlines; a customer without its own uses the Provider default.
 */
function CustomerDeadlinesPage() {
  const list = useListParams({
    flags: FLAGS,
    sorts: SORTS,
    defaultSort: 'name',
  });
  const { params } = list;
  const customers = useCustomerDeadlines({
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
        title="Customer Deadlines"
        breadcrumbsKey="provider.deadlines.list"
      />
      <CustomerDeadlineList list={list} query={customers} />
    </PageBody>
  );
}

function Page() {
  return (
    <ProviderViewGuard
      requiredPermissions={[HelpdeskPermissions.Provider.Support]}
    >
      <CustomerDeadlinesPage />
    </ProviderViewGuard>
  );
}

export default withAuthenticationRequired(Page, {
  OnRedirecting: () => <AppAuthSplash />,
});
