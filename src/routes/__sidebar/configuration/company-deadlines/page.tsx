/**
 * Tenant Deadlines, the list: /configuration/company-deadlines
 *
 * The default first, in plain sentences, since every tenant without its own
 * deadlines uses it. Then every tenant, a page at a time, saying only what
 * differs from the default. There are hundreds of tenants with many
 * organisations each, so the server searches, filters, sorts and pages, and
 * organisations are counted here and listed on the tenant's own page.
 * Netcorp staff only: a tenant never sets its own deadlines.
 */
import {
  DEFAULT_POLICY_KEY,
  type TenantDeadlineRowDto,
} from '@/api/local/company-deadlines';
import { DeadlineList } from '@/components/company-deadlines/components/DeadlineList';
import { DeadlineSummaryCard } from '@/components/company-deadlines/components/DeadlineSummaryCard';
import { DeadlinesAccessDenied } from '@/components/company-deadlines/components/DeadlinesAccessDenied';
import {
  useCompanyDeadlinePolicy,
  useDeadlinesPrincipal,
  useTenantDeadlines,
} from '@/components/company-deadlines/hooks/useCompanyDeadlines';
import { resolveDeadlines } from '@/components/company-deadlines/resolveDeadlines';
import { useListParams } from '@/hooks/useListParams';
import { BaseButton } from '@brainforgeau/components/button';
import { PageBody, PageHeader } from '@brainforgeau/components/page';
import { useNavigate } from '@modern-js/runtime/router';
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';

const FLAGS = ['custom', 'hasLate', 'hasCustomOrgs'] as const;
const SORTS = ['name', 'open', 'late'] as const;
const FLAG_LABELS = {
  custom: 'Custom only',
  hasLate: 'Has late tickets',
  hasCustomOrgs: 'Has custom organisations',
};

const tenantPath = (key: string) => `/configuration/company-deadlines/${key}`;
const rowId = (row: TenantDeadlineRowDto) => row.tenantId;
const pathOf = (row: TenantDeadlineRowDto) => tenantPath(row.tenantId);
const lateOf = (row: TenantDeadlineRowDto) => ({ tenantId: row.tenantId });

/** "12 organisations, 3 custom". */
const orgSummary = (orgCount: number, customOrgCount: number) => {
  if (orgCount === 0) return 'No organisations';
  const orgs = `${orgCount} organisation${orgCount === 1 ? '' : 's'}`;
  return customOrgCount > 0 ? `${orgs}, ${customOrgCount} custom` : orgs;
};

const ORG_COLUMN = [
  createColumnHelper<TenantDeadlineRowDto>().display({
    id: 'organisations',
    header: 'Organisations',
    cell: ({ row }) => (
      <span className="text-default-600 text-sm">
        {orgSummary(row.original.orgCount, row.original.customOrgCount)}
      </span>
    ),
    size: 200,
  }),
] as ColumnDef<TenantDeadlineRowDto, unknown>[];

function CompanyDeadlinesPage() {
  const navigate = useNavigate();
  const {
    principalId,
    isAdmin,
    isLoading: loadingAccess,
  } = useDeadlinesPrincipal();
  const enabledPrincipal = isAdmin ? principalId : undefined;
  const list = useListParams({
    flags: FLAGS,
    sorts: SORTS,
    defaultSort: 'name',
  });
  const { params } = list;
  const tenants = useTenantDeadlines(enabledPrincipal, {
    search: params.search,
    ...params.flags,
    sort: params.sort,
    dir: params.dir,
    page: params.page,
    pageSize: params.pageSize,
  });
  const defaults = useCompanyDeadlinePolicy(
    enabledPrincipal,
    DEFAULT_POLICY_KEY,
  );
  const resolvedDefault = useMemo(
    () =>
      defaults.data
        ? resolveDeadlines({
            values: defaults.data,
            hasOwn: true,
            inherited: null,
            fromName: 'default',
          })
        : null,
    [defaults.data],
  );

  if (!loadingAccess && !isAdmin) return <DeadlinesAccessDenied />;

  return (
    <PageBody>
      <PageHeader
        title="Tenant Deadlines"
        breadcrumbsKey="configuration.company-deadlines.list"
      />
      {resolvedDefault && (
        <div className="mb-4">
          <DeadlineSummaryCard
            title="Default"
            description="Every tenant without deadlines of its own uses these."
            resolved={resolvedDefault}
            isDefault
            actions={
              <BaseButton
                variant="bordered"
                size="sm"
                onPress={() =>
                  navigate(`${tenantPath(DEFAULT_POLICY_KEY)}?edit=1`)
                }
              >
                Edit
              </BaseButton>
            }
          />
        </div>
      )}
      <DeadlineList
        list={list}
        flagLabels={FLAG_LABELS}
        query={{
          data: tenants.data,
          isError: tenants.isError,
          isLoading: loadingAccess || tenants.isLoading,
        }}
        noun="tenant"
        fromName="default"
        getRowId={rowId}
        pathOf={pathOf}
        lateOf={lateOf}
        extraColumns={ORG_COLUMN}
      />
    </PageBody>
  );
}

export default CompanyDeadlinesPage;
