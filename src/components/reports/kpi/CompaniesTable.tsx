import type { KpiCompanyRowDto } from '@/api/local/kpi';
import { formatDuration } from '@/components/shared/deadline';
import { BaseTable } from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import {
  type ColumnDef,
  type PaginationState,
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { type FC, useMemo, useState } from 'react';
import { KpiPanel } from './KpiPanel';
import { formatPct, formatScore } from './kpiFormat';

const TOP = 5;

const columnHelper = createColumnHelper<KpiCompanyRowDto>();

const right = (content: React.ReactNode) => (
  <span className="block text-right tabular-nums">{content}</span>
);

/** Red under 90, orange from 90 to the target, blue at or above it. */
const meterColour = (pct: number, target: number) =>
  pct >= target ? 'bg-[#1868db]' : pct >= 90 ? 'bg-[#e17100]' : 'bg-[#ae2e24]';
const textColour = (pct: number, target: number) =>
  pct >= target ? '' : pct >= 90 ? 'text-[#b65c02]' : 'text-[#ae2e24]';

interface CompaniesTableProps {
  companies: KpiCompanyRowDto[];
  targetPct: number;
  companyName: (tenantId: string) => string;
  onSelectCompany: (tenantId: string) => void;
}

/**
 * Companies, worst deadline record first (the backend's order). The top five
 * at first; "See all" pages through the rest. A company opens its own view.
 */
export const CompaniesTable: FC<CompaniesTableProps> = ({
  companies,
  targetPct,
  companyName,
  onSelectCompany,
}) => {
  const [showAll, setShowAll] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const rows = useMemo(
    () => (showAll ? companies : companies.slice(0, TOP)),
    [companies, showAll],
  );

  const columns = useMemo(
    (): ColumnDef<KpiCompanyRowDto, unknown>[] => [
      columnHelper.display({
        id: 'company',
        header: 'Tenant',
        cell: ({ row }) => (
          <button
            type="button"
            className="text-dark hover:text-primary text-left font-medium hover:underline dark:text-white"
            onClick={() => onSelectCompany(row.original.tenantId)}
          >
            {companyName(row.original.tenantId)}
          </button>
        ),
        size: 220,
      }),
      columnHelper.display({
        id: 'tickets',
        header: () => right('Tickets'),
        cell: ({ row }) => right(row.original.tickets),
        size: 80,
      }),
      columnHelper.display({
        id: 'deadlineMet',
        header: 'Deadline met',
        cell: ({ row }) => {
          const pct = row.original.deadlineMetPct;
          if (pct === null) return <span className="text-default-400">–</span>;
          return (
            <span className="flex items-center gap-3">
              <span
                className={`w-12 tabular-nums ${textColour(pct, targetPct)}`}
              >
                {formatPct(pct)}
              </span>
              <span className="bg-default-100 h-1.5 w-[90px] overflow-hidden rounded-sm">
                <span
                  className={`block h-full ${meterColour(pct, targetPct)}`}
                  style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                />
              </span>
            </span>
          );
        },
        size: 190,
      }),
      columnHelper.display({
        id: 'firstReply',
        header: () => right('Time to first reply'),
        cell: ({ row }) =>
          right(
            row.original.avgFirstReplyMinutes === null
              ? '–'
              : formatDuration(row.original.avgFirstReplyMinutes),
          ),
        size: 140,
      }),
      columnHelper.display({
        id: 'fix',
        header: () => right('Time to fix'),
        cell: ({ row }) =>
          right(
            row.original.avgFixMinutes === null
              ? '–'
              : formatDuration(row.original.avgFixMinutes),
          ),
        size: 120,
      }),
      columnHelper.display({
        id: 'cameBack',
        header: () => right('Came back'),
        cell: ({ row }) => right(formatPct(row.original.cameBackPct)),
        size: 100,
      }),
      columnHelper.display({
        id: 'csat',
        header: () => right('Client satisfaction'),
        cell: ({ row }) => right(formatScore(row.original.csatAverage)),
        size: 140,
      }),
      columnHelper.display({
        id: 'open',
        header: () => right('Open now'),
        cell: ({ row }) =>
          right(
            <>
              {row.original.openNow}
              {row.original.lateNow > 0 && (
                <span className="text-[#ae2e24]">
                  {' '}
                  ({row.original.lateNow} late)
                </span>
              )}
            </>,
          ),
        size: 110,
      }),
    ],
    [companyName, onSelectCompany, targetPct],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: r => r.tenantId,
    getCoreRowModel: getCoreRowModel(),
    ...(showAll
      ? {
          getPaginationRowModel: getPaginationRowModel(),
          state: { pagination },
          onPaginationChange: setPagination,
        }
      : {}),
  });

  return (
    <KpiPanel
      title="Tenants, worst deadline record first"
      aside={
        companies.length > TOP && (
          <BaseButton
            variant="link"
            size="none"
            className="text-primary text-sm print:hidden"
            onPress={() => setShowAll(v => !v)}
          >
            {showAll
              ? 'Show the worst 5'
              : `See all ${companies.length} tenants`}
          </BaseButton>
        )
      }
    >
      <BaseTable table={table} embedded />
    </KpiPanel>
  );
};
