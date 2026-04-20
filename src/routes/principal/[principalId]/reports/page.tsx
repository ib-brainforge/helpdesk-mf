/**
 * Principal reports page — /principal/[principalId]/reports
 *
 * Available to both admin and agent roles.
 * Shows ticket-volume report with a date range picker and recharts BarChart.
 * Wired to PrincipalReportsApi from @brainforgeau/helpdesk-client.
 */

import { usePrincipalTicketVolume } from '@/hooks/usePrincipalReports';
import {
  BaseButton,
  BaseInput,
  BaseTable,
  PageSpinner,
} from '@brainforgeau/components';
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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Reports</h1>

      {/* Date range picker */}
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

      {isLoading && (
        <div className="flex h-32 items-center justify-center">
          <PageSpinner title="Loading report..." />
        </div>
      )}

      {error && (
        <div className="rounded border border-danger-200 bg-danger-50 p-4 text-danger">
          Failed to load report data. Please try again.
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          {/* Summary card */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-lg border p-5">
              <span className="text-sm text-default-500">Total Tickets</span>
              <span className="text-3xl font-bold">{totalCount}</span>
              <span className="text-xs text-default-400">
                {appliedFrom} to {appliedTo}
              </span>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 ? (
            <div className="rounded-lg border p-5">
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
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-default-400 text-sm">
              No ticket data for the selected date range.
            </div>
          )}

          {/* Bucket table */}
          {chartData.length > 0 && (
            <BaseTable
              table={table}
              isLoading={false}
              loading={{ title: 'Loading...' }}
            />
          )}
        </>
      )}
    </div>
  );
}

export default withAuthenticationRequired(PrincipalReportsPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
