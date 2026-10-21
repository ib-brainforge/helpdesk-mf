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
import {
  DeadlineDifferences,
  LateCount,
} from '@/components/company-deadlines/components/DeadlineCells';
import { DeadlineSummaryCard } from '@/components/company-deadlines/components/DeadlineSummaryCard';
import {
  useCompanyDeadlinePolicy,
  useDeadlinesPrincipal,
  useTenantDeadlines,
} from '@/components/company-deadlines/hooks/useCompanyDeadlines';
import { resolveDeadlines } from '@/components/company-deadlines/resolveDeadlines';
import { IconTip, PagedTable, usePagedTable } from '@/components/shared';
import { useListParams } from '@/hooks/useListParams';
import { AccessDenied } from '@/security';
import { BaseCheckbox, BaseInput } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import {
  EmptyState,
  PageBody,
  PageFilters,
  PageHeader,
} from '@brainforgeau/components/page';
import { NavLink, useNavigate } from '@modern-js/runtime/router';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';

const FLAGS = ['custom', 'hasLate', 'hasCustomOrgs'] as const;
const SORTS = ['name', 'open', 'late'] as const;
const FLAG_LABELS: Record<(typeof FLAGS)[number], string> = {
  custom: 'Custom only',
  hasLate: 'Has late tickets',
  hasCustomOrgs: 'Has custom organisations',
};

const tenantPath = (key: string) => `/configuration/company-deadlines/${key}`;

const columnHelper = createColumnHelper<TenantDeadlineRowDto>();

/** "12 organisations, 3 custom". */
const orgSummary = (orgCount: number, customOrgCount: number) => {
  if (orgCount === 0) return 'No organisations';
  const orgs = `${orgCount} organisation${orgCount === 1 ? '' : 's'}`;
  return customOrgCount > 0 ? `${orgs}, ${customOrgCount} custom` : orgs;
};

const columns = [
  columnHelper.accessor('name', {
    id: 'name',
    header: 'Tenant',
    cell: ({ row }) => (
      <NavLink
        to={tenantPath(row.original.tenantId)}
        className="text-primary text-sm font-medium hover:underline"
      >
        {row.original.name}
      </NavLink>
    ),
    size: 240,
  }),
  columnHelper.display({
    id: 'deadlines',
    header: 'Deadlines',
    enableSorting: false,
    cell: ({ row }) => {
      const { differences, isCustom } = row.original;
      return (
        <div className="whitespace-normal py-1">
          <DeadlineDifferences differences={differences} fromName="default" />
          {isCustom && differences.length === 0 && (
            <span className="text-default-500 text-xs"> (own copy)</span>
          )}
        </div>
      );
    },
    size: 380,
  }),
  columnHelper.display({
    id: 'organisations',
    header: 'Organisations',
    enableSorting: false,
    cell: ({ row }) => {
      const { orgCount, customOrgCount } = row.original;
      return (
        <span className="text-default-600 text-sm">
          {orgSummary(orgCount, customOrgCount)}
        </span>
      );
    },
    size: 200,
  }),
  columnHelper.accessor('open', {
    id: 'open',
    header: () => <span className="block text-right">Open</span>,
    cell: ({ getValue }) => (
      <span className="block text-right text-sm tabular-nums">
        {getValue()}
      </span>
    ),
    size: 90,
  }),
  columnHelper.accessor('late', {
    id: 'late',
    header: () => <span className="block text-right">Late</span>,
    cell: ({ row }) => (
      <LateCount
        late={row.original.late}
        tenantId={row.original.tenantId}
        name={row.original.name}
      />
    ),
    size: 90,
  }),
  columnHelper.display({
    id: 'go',
    header: () => <span className="sr-only">Open</span>,
    enableSorting: false,
    cell: ({ row }) => (
      <IconTip label={`Open ${row.original.name}'s deadlines`}>
        <NavLink
          to={tenantPath(row.original.tenantId)}
          aria-label={`Open ${row.original.name}'s deadlines`}
          className="text-default-400 hover:text-primary flex h-6 w-6 items-center justify-center rounded"
        >
          <Icon name="ChevronRightIcon" className="h-4 w-4" />
        </NavLink>
      </IconTip>
    ),
    size: 48,
  }),
];

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

  const table = usePagedTable({
    data: tenants.data?.items ?? [],
    columns,
    total: tenants.data?.total ?? 0,
    params,
    onChange: patch => list.update(patch as Parameters<typeof list.update>[0]),
    getRowId: row => row.tenantId,
  });

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

  if (!loadingAccess && !isAdmin) {
    return (
      <div className="flex min-h-[60vh] w-full flex-1 items-center justify-center p-6">
        <AccessDenied
          title="You don't have access to this page"
          message="Tenant deadlines are set by Netcorp's helpdesk admins."
        />
      </div>
    );
  }

  const total = tenants.data?.total;

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
                onPress={() => navigate(tenantPath(DEFAULT_POLICY_KEY))}
              >
                Edit
              </BaseButton>
            }
          />
        </div>
      )}
      <PageFilters
        onClear={list.hasFilters ? list.clear : undefined}
        hasActiveFilters={list.hasFilters}
        rightSlot={
          total !== undefined && (
            <span className="text-default-500 text-sm" aria-live="polite">
              {total} tenant{total === 1 ? '' : 's'}
            </span>
          )
        }
      >
        <BaseInput
          aria-label="Search tenants"
          placeholder="Search tenants..."
          value={list.searchText}
          onChange={e => list.setSearchText(e.target.value)}
          startContent={
            <Icon
              name="magnifying-glass"
              className="h-4 w-4 text-default-400"
            />
          }
          className="helpdesk-filter-row max-w-xs"
        />
        {FLAGS.map(flag => (
          <BaseCheckbox
            key={flag}
            isSelected={params.flags[flag]}
            onValueChange={checked =>
              list.update({ flags: { ...params.flags, [flag]: checked } })
            }
          >
            {FLAG_LABELS[flag]}
          </BaseCheckbox>
        ))}
      </PageFilters>
      <PagedTable
        table={table}
        isLoading={loadingAccess || tenants.isLoading}
        empty={
          <EmptyState
            title={
              tenants.isError
                ? "Couldn't load the tenants"
                : 'No tenants match these filters'
            }
            description={
              tenants.isError
                ? 'Reload the page to try again.'
                : 'Try a different name, or clear the filters.'
            }
            live
          />
        }
      />
    </PageBody>
  );
}

export default CompanyDeadlinesPage;
