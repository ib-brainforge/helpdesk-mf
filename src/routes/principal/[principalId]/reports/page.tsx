/**
 * Principal reports page — /principal/[principalId]/reports
 *
 * Available to both admin and agent roles.
 * Shows ticket-volume report with a date range picker and recharts BarChart.
 * Wired to PrincipalReportsApi from @brainforgeau/helpdesk-client.
 */

import { usePrincipalTicketVolume } from '@/hooks/usePrincipalReports';
import { BaseButton, BaseInput, PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useParams } from '@modern-js/runtime/router';
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
    () => (data ?? []).reduce((sum, d) => sum + (d.count ?? 0), 0),
    [data],
  );

  const chartData = useMemo(
    () =>
      (data ?? []).map(item => ({
        date: item.date ? item.date.slice(0, 10) : '',
        count: item.count ?? 0,
      })),
    [data],
  );

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
                    fill="#6366f1"
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
            <div className="rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-default-50">
                    <th className="px-4 py-2 text-left font-medium">Date</th>
                    <th className="px-4 py-2 text-right font-medium">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map(row => (
                    <tr key={row.date} className="border-b last:border-0">
                      <td className="px-4 py-2 font-mono text-xs">
                        {row.date}
                      </td>
                      <td className="px-4 py-2 text-right">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default withAuthenticationRequired(PrincipalReportsPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
