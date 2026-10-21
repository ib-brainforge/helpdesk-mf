/**
 * Company Deadlines, the list: /configuration/company-deadlines
 *
 * One row per company, plus the default that every company without its own
 * policy follows. A company with several organisations expands to show them,
 * since each can have deadlines of its own (organisation, else company, else
 * default). Netcorp staff only: a company never sets its own deadlines.
 * Clicking a company or an organisation opens its policy.
 */
import {
  type CompanyDeadlineOrganisationSummaryDto,
  DEFAULT_POLICY_KEY,
  policyKey,
} from '@/api/local/company-deadlines';
import {
  describeHours,
  formatTargetMinutes,
} from '@/components/company-deadlines/deadlinePolicy';
import {
  useCompanyDeadlinePolicy,
  useCompanyDeadlineSummaries,
  useDeadlinesPrincipal,
} from '@/components/company-deadlines/hooks/useCompanyDeadlines';
import { IconTip } from '@/components/shared';
import { useScopeNames } from '@/hooks/useScopeNames';
import { AccessDenied } from '@/security';
import { BaseInput } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { EmptyState, ListPage } from '@brainforgeau/components/page';
import { NavLink } from '@modern-js/runtime/router';
import {
  type ColumnDef,
  type ExpandedState,
  createColumnHelper,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

interface CompanyDeadlineRow {
  /** policyKey: DEFAULT_POLICY_KEY, a tenant id, or a tenant and organisation. */
  key: string;
  name: string;
  isDefault: boolean;
  /** An organisation row, under its company. */
  isOrganisation: boolean;
  /** It has its own policy (always false for the default row). */
  isCustom: boolean;
  hours: string;
  highReplyMinutes: number | null;
  highFixMinutes: number | null;
  openTickets: number | null;
  lateTickets: number;
  /** Where "late" links to on the Tickets list; none for the default row. */
  ticketsQuery?: string;
  /** A company's organisations, when it has more than one. */
  subRows?: CompanyDeadlineRow[];
}

const columnHelper = createColumnHelper<CompanyDeadlineRow>();

const pillClass = 'rounded-full px-2 py-0.5 text-[11px] font-medium';

function CompanyDeadlinesPage() {
  const {
    principalId,
    isAdmin,
    isLoading: loadingAccess,
  } = useDeadlinesPrincipal();
  const {
    tenantOptions,
    organisationOptions,
    isLoading: loadingNames,
  } = useScopeNames();
  const summaries = useCompanyDeadlineSummaries(
    isAdmin ? principalId : undefined,
  );
  const defaults = useCompanyDeadlinePolicy(
    isAdmin ? principalId : undefined,
    DEFAULT_POLICY_KEY,
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<ExpandedState>({});

  /*
   * Every company the user can reach, from contexts, joined to its summary.
   * The backend only has rows for companies with a policy or with tickets, so
   * the rest are shown on the default, which is what they follow.
   *
   * Organisations come from contexts too, never from the summary alone (the
   * backend has no organisation directory). Their summary entries carry the
   * effective values; one without an entry uses its company's.
   */
  const rows = useMemo((): CompanyDeadlineRow[] => {
    const policy = defaults.data;
    const high = policy?.targets.find(t => t.priority === 'High');
    const defaultHours = policy ? describeHours(policy) : '';
    const byTenant = new Map((summaries.data ?? []).map(s => [s.tenantId, s]));

    const orgsByTenant = new Map<string, typeof organisationOptions>();
    for (const o of organisationOptions) {
      if (!o.parentId) continue;
      orgsByTenant.set(o.parentId, [
        ...(orgsByTenant.get(o.parentId) ?? []),
        o,
      ]);
    }

    const defaultRow: CompanyDeadlineRow = {
      key: DEFAULT_POLICY_KEY,
      name: 'Default for all companies',
      isDefault: true,
      isOrganisation: false,
      isCustom: false,
      hours: defaultHours,
      highReplyMinutes: high?.replyMinutes ?? null,
      highFixMinutes: high?.fixMinutes ?? null,
      openTickets: null,
      lateTickets: 0,
    };

    const companies = tenantOptions.map((t): CompanyDeadlineRow => {
      const s = byTenant.get(t.id);
      const company: CompanyDeadlineRow = {
        key: t.id,
        name: t.name,
        isDefault: false,
        isOrganisation: false,
        isCustom: s?.isCustom ?? false,
        hours: s?.hoursText ?? defaultHours,
        highReplyMinutes: s?.highReplyMinutes ?? high?.replyMinutes ?? null,
        highFixMinutes: s?.highFixMinutes ?? high?.fixMinutes ?? null,
        openTickets: s?.openTickets ?? 0,
        lateTickets: s?.lateTickets ?? 0,
        ticketsQuery: `tenant=${encodeURIComponent(t.id)}`,
      };

      const orgSummaries = new Map<
        string,
        CompanyDeadlineOrganisationSummaryDto
      >((s?.organisations ?? []).map(o => [o.organisationId, o]));
      const orgs = orgsByTenant.get(t.id) ?? [];
      // A single organisation is the company, so it stays one row, unless it
      // has deadlines of its own, which must stay reachable from here.
      if (orgs.length < 2 && !orgs.some(o => orgSummaries.get(o.id)?.isCustom))
        return company;

      company.subRows = orgs.map((o): CompanyDeadlineRow => {
        const os = orgSummaries.get(o.id);
        return {
          key: policyKey(t.id, o.id),
          name: o.name,
          isDefault: false,
          isOrganisation: true,
          isCustom: os?.isCustom ?? false,
          hours: os?.hoursText ?? company.hours,
          highReplyMinutes: os?.highReplyMinutes ?? company.highReplyMinutes,
          highFixMinutes: os?.highFixMinutes ?? company.highFixMinutes,
          openTickets: os?.openTickets ?? 0,
          lateTickets: os?.lateTickets ?? 0,
          ticketsQuery: `tenant=${encodeURIComponent(t.id)}&organisation=${encodeURIComponent(o.id)}`,
        };
      });
      return company;
    });

    // A company matches by its own name or any of its organisations'.
    const term = searchTerm.trim().toLowerCase();
    const shown = term
      ? companies.filter(
          c =>
            c.name.toLowerCase().includes(term) ||
            c.subRows?.some(o => o.name.toLowerCase().includes(term)),
        )
      : companies;
    return term ? shown : [defaultRow, ...shown];
  }, [
    defaults.data,
    summaries.data,
    tenantOptions,
    organisationOptions,
    searchTerm,
  ]);

  const columns = useMemo(
    (): ColumnDef<CompanyDeadlineRow, unknown>[] => [
      columnHelper.display({
        id: 'company',
        header: 'Company',
        cell: ({ row }) => {
          const r = row.original;
          const label = `${row.getIsExpanded() ? 'Hide' : 'Show'} ${r.name}'s organisations`;
          return (
            <span
              className={`flex items-center gap-1.5 ${r.isOrganisation ? 'pl-7' : ''}`}
            >
              {row.getCanExpand() ? (
                <IconTip label={label}>
                  <button
                    type="button"
                    aria-label={label}
                    aria-expanded={row.getIsExpanded()}
                    onClick={row.getToggleExpandedHandler()}
                    className="text-default-500 hover:text-default-700 flex h-5 w-5 shrink-0 items-center justify-center rounded"
                  >
                    <Icon
                      name={
                        row.getIsExpanded()
                          ? 'ChevronDownIcon'
                          : 'ChevronRightIcon'
                      }
                      className="h-4 w-4"
                    />
                  </button>
                </IconTip>
              ) : (
                !r.isOrganisation && !r.isDefault && <span className="w-5" />
              )}
              <NavLink
                to={`/configuration/company-deadlines/${r.key}`}
                className={`text-primary hover:underline ${r.isDefault ? 'font-semibold' : 'font-medium'}`}
              >
                {r.name}
              </NavLink>
            </span>
          );
        },
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
        header: 'High priority: reply / fix',
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
          const { openTickets, lateTickets, ticketsQuery } = row.original;
          if (openTickets === null) return null;
          return (
            <span className="block text-right text-sm tabular-nums">
              {openTickets}
              {lateTickets > 0 &&
                (ticketsQuery ? (
                  // Straight to the late tickets, the question this number raises.
                  <NavLink
                    to={`/tickets?tab=overdue&${ticketsQuery}`}
                    className="text-red-dark hover:underline"
                  >
                    {' '}
                    ({lateTickets} late)
                  </NavLink>
                ) : (
                  <span className="text-red-dark"> ({lateTickets} late)</span>
                ))}
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
            // The same words for the same state on both levels: what it
            // inherits from.
            <span className="text-default-500 text-xs">
              {row.original.isOrganisation
                ? "Uses the company's"
                : 'Uses the default'}
            </span>
          ),
        size: 120,
      }),
      columnHelper.display({
        id: 'open-row',
        header: () => <span className="sr-only">Open</span>,
        // The name is the link, but nothing else on the row said it opened.
        cell: ({ row }) => (
          <IconTip label={`Edit ${row.original.name}'s deadlines`}>
            <NavLink
              to={`/configuration/company-deadlines/${row.original.key}`}
              aria-label={`Edit ${row.original.name}'s deadlines`}
              className="text-default-400 hover:text-blue flex h-6 w-6 items-center justify-center rounded"
            >
              <Icon name="ChevronRightIcon" className="h-4 w-4" />
            </NavLink>
          </IconTip>
        ),
        size: 40,
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: row => row.key,
    getSubRows: row => row.subRows,
    getExpandedRowModel: getExpandedRowModel(),
    // Everything opens while searching, so a match on an organisation shows.
    state: { expanded: searchTerm.trim() ? true : expanded },
    onExpandedChange: setExpanded,
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
      // Clear only exists while there is something to clear.
      onClearFilters={searchTerm ? () => setSearchTerm('') : undefined}
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
