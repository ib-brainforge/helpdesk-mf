/**
 * Principal reports page — /principal/[principalId]/reports
 *
 * W1-P6: Migrated to <DashboardPage>. Shows ticket-volume chart + data table
 * for the principal-scoped date range. Date filters rendered in the actions
 * slot (colocated controls per design doc).
 */

import { AppAuthSplash } from '@/components/AppSplash';
import { SummaryCard } from '@/components/shared';
import { usePrincipal } from '@/hooks/usePrincipal';
import { usePrincipalTicketVolume } from '@/hooks/usePrincipalReports';
import { BaseButton, BaseInput, BaseTable } from '@brainforgeau/components';
import {
  DashboardPage,
  EmptyState,
  PendingCrumb,
} from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useParams } from '@modern-js/runtime/router';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// REVIEW: Chart bar color #6366f1 is Tailwind indigo-500 / HeroUI primary-500.
// Swap for `var(--color-primary)` once HeroUI exposes the CSS variable on BarChart fill.
const CHART_BAR_COLOR = '#6366f1';

interface TicketVolumeRow {
  date: string;
  count: number;
}

const columnHelper = createColumnHelper<TicketVolumeRow>();

const columns = [
  columnHelper.accessor('date', {
    header: 'Date',
    cell: info => <span className="font-mono text-xs">{info.getValue()}</span>,
  }),
  columnHelper.accessor('count', {
    header: 'Count',
    cell: info => <span className="tabular-nums">{info.getValue()}</span>,
  }),
];

function toIsoDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toIsoDateString(d);
}

function defaultTo(): string {
  return toIsoDateString(new Date());
}

function PrincipalReportsPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const { data: principal } = usePrincipal(principalId);

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [appliedFrom, setAppliedFrom] = useState(defaultFrom);
  const [appliedTo, setAppliedTo] = useState(defaultTo);

  const { data, isLoading, error } = usePrincipalTicketVolume(
    principalId ?? '',
    appliedFrom,
    appliedTo,
  );

  const totalCount = useMemo(
    () => (data ?? []).reduce((sum, item) => sum + (item.count ?? 0), 0),
    [data],
  );

  const chartData = useMemo<TicketVolumeRow[]>(
    () =>
      (data ?? []).map(item => ({
        date: item.date ? item.date.slice(0, 10) : '',
        count: item.count ?? 0,
      })),
    [data],
  );

  const table = useReactTable({
    data: chartData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleApply = () => {
    setAppliedFrom(from);
    setAppliedTo(to);
  };

  return (
    <DashboardPage
      title="Reports"
      breadcrumbsKey="principal.reports"
      breadcrumbsParams={{
        principalId: principalId!,
        principalName: principal?.name ?? PendingCrumb,
      }}
      actions={
        <div className="flex flex-wrap items-end gap-3">
          <BaseInput
            label="From"
            type="date"
            value={from}
            onValueChange={setFrom}
            className="w-40"
          />
          <BaseInput
            label="To"
            type="date"
            value={to}
            onValueChange={setTo}
            className="w-40"
          />
          <BaseButton onPress={handleApply}>Apply</BaseButton>
        </div>
      }
      summary={
        !isLoading && !error && data ? (
          <SummaryCard
            title="Total Tickets"
            value={totalCount}
            subtitle={`${appliedFrom} to ${appliedTo}`}
          />
        ) : undefined
      }
      charts={
        !isLoading && !error && chartData.length > 0 ? (
          <div className="rounded-lg border p-5 md:col-span-2 xl:col-span-2">
            <h2 className="mb-4 text-sm font-medium">Ticket Volume by Day</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  name="Tickets"
                  fill={CHART_BAR_COLOR}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : undefined
      }
    >
      {error && (
        <div className="rounded border border-danger-200 bg-danger-50 p-4 text-danger">
          Failed to load report data. Please try again.
        </div>
      )}

      {!isLoading && !error && chartData.length === 0 && (
        <EmptyState
          title="No data for selected range"
          description="Try a different date range."
          live
        />
      )}

      {!isLoading && !error && chartData.length > 0 && (
        <BaseTable
          table={table}
          isLoading={false}
          loading={{ title: 'Loading...' }}
        />
      )}
    </DashboardPage>
  );
}

export default withAuthenticationRequired(PrincipalReportsPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
