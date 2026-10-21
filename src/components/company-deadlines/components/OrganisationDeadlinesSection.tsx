import {
  type OrganisationDeadlineRowDto,
  policyKey,
} from '@/api/local/company-deadlines';
import { useListParams } from '@/hooks/useListParams';
import { type FC, useCallback } from 'react';
import { useOrganisationDeadlines } from '../hooks/useCompanyDeadlines';
import { DeadlineList } from './DeadlineList';

const FLAGS = ['custom', 'hasLate'] as const;
const SORTS = ['name', 'open', 'late'] as const;
const FLAG_LABELS = { custom: 'Custom only', hasLate: 'Has late tickets' };

const rowId = (row: OrganisationDeadlineRowDto) => row.organisationId;

/**
 * A tenant's organisations, on the tenant's page: what each changes from
 * the tenant's deadlines, its open and late tickets. Paged on the server
 * like the tenants list, with its own `org` keys in the address bar.
 */
export const OrganisationDeadlinesSection: FC<{
  principalId?: string;
  tenantId: string;
  tenantName: string;
}> = ({ principalId, tenantId, tenantName }) => {
  const list = useListParams({
    prefix: 'org',
    flags: FLAGS,
    sorts: SORTS,
    defaultSort: 'name',
  });
  const { params } = list;
  const query = useOrganisationDeadlines(principalId, tenantId, {
    search: params.search,
    ...params.flags,
    sort: params.sort,
    dir: params.dir,
    page: params.page,
    pageSize: params.pageSize,
  });
  const pathOf = useCallback(
    (row: OrganisationDeadlineRowDto) =>
      `/configuration/company-deadlines/${policyKey(tenantId, row.organisationId)}`,
    [tenantId],
  );
  const lateOf = useCallback(
    (row: OrganisationDeadlineRowDto) => ({
      tenantId,
      organisationId: row.organisationId,
    }),
    [tenantId],
  );

  return (
    <section className="mt-8" aria-labelledby="tenant-organisations">
      <h2
        id="tenant-organisations"
        className="text-dark mb-1 text-base font-semibold dark:text-white"
      >
        Organisations
      </h2>
      <p className="text-default-600 mb-3 text-sm">
        Each uses {tenantName}'s deadlines unless it has its own.
      </p>
      {/* A height for the table to fill: it scrolls inside, the page does not. */}
      <div className="flex h-[40rem] flex-col">
        <DeadlineList
          list={list}
          flagLabels={FLAG_LABELS}
          query={query}
          noun="organisation"
          fromName={tenantName}
          getRowId={rowId}
          pathOf={pathOf}
          lateOf={lateOf}
        />
      </div>
    </section>
  );
};
