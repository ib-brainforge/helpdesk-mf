/**
 * Company Deadlines, the list: /configuration/company-deadlines
 *
 * One row per company, plus the default that every company without its own
 * policy follows. Netcorp staff only: a company never sets its own deadlines.
 * Clicking a company opens its policy ([tenantId]/page.tsx).
 */
import { DEFAULT_POLICY_KEY } from '@/api/local/company-deadlines';
import {
  describeHours,
  formatTargetMinutes,
} from '@/components/company-deadlines/deadlinePolicy';
import {
  useCompanyDeadlinePolicy,
  useCompanyDeadlineSummaries,
  useDeadlinesPrincipal,
} from '@/components/company-deadlines/hooks/useCompanyDeadlines';
import { useScopeNames } from '@/hooks/useScopeNames';
import { BaseInput } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { EmptyState, ListPage } from '@brainforgeau/components/page';
import { AccessDenied } from '@brainforgeau/security';
import { NavLink } from '@modern-js/runtime/router';
import {
  type ColumnDef,
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

interface CompanyDeadlineRow {
  /** Tenant id, or DEFAULT_POLICY_KEY for the default row. */
  key: string;
  name: string;
  isDefault: boolean;
  /** The company has its own policy (always false for the default row). */
  isCustom: boolean;
  hours: string;
  highReplyMinutes: number | null;
  highFixMinutes: number | null;
  openTickets: number | null;
  lateTickets: number;
}

const columnHelper = createColumnHelper<CompanyDeadlineRow>();

const pillClass = 'rounded-full px-2 py-0.5 text-[11px] font-medium';

function CompanyDeadlinesPage() {
  const {
    principalId,
    isAdmin,
    isLoading: loadingAccess,
  } = useDeadlinesPrincipal();
  const { tenantOptions, isLoading: loadingNames } = useScopeNames();
  const summaries = useCompanyDeadlineSummaries(
    isAdmin ? principalId : undefined,
  );
  const defaults = useCompanyDeadlinePolicy(
    isAdmin ? principalId : undefined,
    DEFAULT_POLICY_KEY,
  );
  const [searchTerm, setSearchTerm] = useState('');

  /*
   * Every company the user can reach, from contexts, joined to its summary.
   * The backend only has rows for companies with a policy or with tickets, so
   * the rest are shown on the default, which is what they follow.
   */
  const rows = useMemo((): CompanyDeadlineRow[] => {
    const policy = defaults.data;
    const high = policy?.targets.find(t => t.priority === 'High');
    const defaultHours = policy ? describeHours(policy) : '';
    const byTenant = new Map((summaries.data ?? []).map(s => [s.tenantId, s]));

    const defaultRow: CompanyDeadlineRow = {
      key: DEFAULT_POLICY_KEY,
      name: 'Default for all companies',
      isDefault: true,
      isCustom: false,
      hours: defaultHours,
      highReplyMinutes: high?.replyMinutes ?? null,
      highFixMinutes: high?.fixMinutes ?? null,
      openTickets: null,
      lateTickets: 0,
    };

    const companies = tenantOptions.map((t): CompanyDeadlineRow => {
      const s = byTenant.get(t.id);
      return {
        key: t.id,
        name: t.name,
        isDefault: false,
        isCustom: s?.isCustom ?? false,
        hours: s?.hoursText ?? defaultHours,
        highReplyMinutes: s?.highReplyMinutes ?? high?.replyMinutes ?? null,
        highFixMinutes: s?.highFixMinutes ?? high?.fixMinutes ?? null,
        openTickets: s?.openTickets ?? 0,
        lateTickets: s?.lateTickets ?? 0,
      };
    });

    const term = searchTerm.trim().toLowerCase();
    const shown = term
      ? companies.filter(c => c.name.toLowerCase().includes(term))
      : companies;
    return term ? shown : [defaultRow, ...shown];
  }, [defaults.data, summaries.data, tenantOptions, searchTerm]);

  const columns = useMemo(
    (): ColumnDef<CompanyDeadlineRow, unknown>[] => [
      columnHelper.display({
        id: 'company',
        header: 'Company',
        cell: ({ row }) => (
          <NavLink
            to={`/configuration/company-deadlines/${row.original.key}`}
            className={`text-primary hover:underline ${row.original.isDefault ? 'font-semibold' : 'font-medium'}`}
          >
            {row.original.name}
          </NavLink>
        ),
        size: 260,
      }),
      columnHelper.display({
        id: 'clock',
        header: 'Clock',
        cell: ({ row }) => (
          <span className="text-default-600 text-sm">{row.original.hours}</span>
        ),
        size: 280,
      }),
      columnHelper.display({
        id: 'high',
        header: 'High reply / fix',
        cell: ({ row }) => {
          const { highReplyMinutes: reply, highFixMinutes: fix } = row.original;
          if (reply === null || fix === null) return null;
          return (
            <span className="text-sm">
              {formatTargetMinutes(reply)} / {formatTargetMinutes(fix)}
            </span>
          );
        },
        size: 150,
      }),
      columnHelper.display({
        id: 'open',
        header: () => <span className="block text-right">Open (late)</span>,
        cell: ({ row }) => {
          const { openTickets, lateTickets } = row.original;
          if (openTickets === null) return null;
          return (
            <span className="block text-right text-sm tabular-nums">
              {openTickets}
              {lateTickets > 0 && (
                <span className="text-red-dark"> ({lateTickets} late)</span>
              )}
            </span>
          );
        },
        size: 120,
      }),
      columnHelper.display({
        id: 'policy',
        header: 'Policy',
        cell: ({ row }) =>
          row.original.isDefault ? null : row.original.isCustom ? (
            <span className={`bg-lighter-blue text-blue ${pillClass}`}>
              Custom
            </span>
          ) : (
            <span className={`bg-default-100 text-default-600 ${pillClass}`}>
              Default
            </span>
          ),
        size: 100,
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: row => row.key,
  });

  if (!loadingAccess && !isAdmin) {
    return (
      <div className="flex min-h-[60vh] w-full flex-1 items-center justify-center p-6">
        <AccessDenied
          title="You don't have access to this page"
          message="Company deadlines are set by Netcorp's helpdesk admins."
        />
      </div>
    );
  }

  return (
    <ListPage
      title="Company Deadlines"
      breadcrumbsKey="configuration.company-deadlines.list"
      table={table}
      isLoading={
        loadingAccess ||
        loadingNames ||
        summaries.isLoading ||
        defaults.isLoading
      }
      filters={
        <BaseInput
          placeholder="Search companies..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          startContent={
            <Icon
              name="magnifying-glass"
              className="h-4 w-4 text-default-400"
            />
          }
          className="max-w-md"
        />
      }
      hasActiveFilters={searchTerm.length > 0}
      onClearFilters={() => setSearchTerm('')}
      empty={
        <EmptyState
          title="No companies match your search"
          description="Try a different name or clear the search."
          live
        />
      }
    />
  );
}

export default CompanyDeadlinesPage;
