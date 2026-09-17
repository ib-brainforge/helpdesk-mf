import { AppLoadingSplash } from '@/components/AppSplash';
import { useTicketsByPriorityReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import { SummaryCard } from '@/components/shared';
import type { TicketByPriorityDto } from '@/types';
import { BaseButton, BaseTable } from '@brainforgeau/components';
import { Box, Icon } from '@brainforgeau/components/base';
import { BaseDateRangePicker } from '@brainforgeau/components/date-picker';
import { DashboardPage, EmptyState } from '@brainforgeau/components/page';
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#f31260',
  High: '#f5a524',
  Normal: '#006fee',
  Low: '#9ca3af',
  None: '#e5e7eb',
};

function TicketsByPriorityPage() {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0],
  );

  const { data: priorities = [], isLoading } = useTicketsByPriorityReport(
    startDate,
    endDate,
  );

  const chartData = priorities.map(p => ({
    name: p.priority,
    total: p.total,
    fill: PRIORITY_COLORS[p.priority] ?? '#9ca3af',
  }));

  const totalTickets = useMemo(
    () => priorities.reduce((sum, p) => sum + p.total, 0),
    [priorities],
  );

  const criticalCount = useMemo(
    () => priorities.find(p => p.priority === 'Critical')?.total ?? 0,
    [priorities],
  );

  const highCount = useMemo(
    () => priorities.find(p => p.priority === 'High')?.total ?? 0,
    [priorities],
  );

  const columns: ColumnDef<TicketByPriorityDto, any>[] = [
    { accessorKey: 'priority', header: 'Priority' },
    {
      accessorKey: 'total',
      header: 'Total Tickets',
      cell: info => (
        <span className="font-semibold">{info.getValue() as number}</span>
      ),
    },
  ];

  const table = useReactTable({
    data: priorities,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleExport = () => {
    exportToXlsx(
      priorities.map(p => ({
        Priority: p.priority,
        Total: p.total,
        ...Object.fromEntries(
          Object.entries(p.byStatus).map(([k, v]) => [`Status: ${k}`, v]),
        ),
      })),
      'tickets-by-priority',
    );
  };

  if (isLoading) return <AppLoadingSplash />;

  return (
    <DashboardPage
      title="Tickets by Priority"
      breadcrumbsKey="reports.by-priority"
      actions={
        <>
          <BaseDateRangePicker
            value={{ start: new Date(startDate), end: new Date(endDate) }}
            onChange={({ start, end }) => {
              setStartDate(start.toISOString().split('T')[0]);
              setEndDate(end.toISOString().split('T')[0]);
            }}
          />
          <BaseButton
            variant="bordered"
            onPress={handleExport}
            isDisabled={priorities.length === 0}
            icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
          >
            Export XLSX
          </BaseButton>
        </>
      }
      summary={
        <>
          <SummaryCard
            title="Total Tickets"
            value={totalTickets}
            icon="ticket"
            variant="default"
          />
          <SummaryCard
            title="Critical"
            value={criticalCount}
            icon="exclamation-circle"
            variant="danger"
          />
          <SummaryCard
            title="High"
            value={highCount}
            icon="exclamation-triangle"
            variant="warning"
          />
          <SummaryCard
            title="Priority Levels"
            value={priorities.length}
            icon="squares-2x2"
            variant="info"
          />
        </>
      }
      charts={
        <Box title="Priority Distribution">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v: number) => `${v} tickets`} />
                <Legend />
                <Bar dataKey="total" name="Tickets" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No priority data" size="sm" />
          )}
        </Box>
      }
    >
      <BaseTable table={table} isLoading={false} fullHeight={false} />
    </DashboardPage>
  );
}

export default TicketsByPriorityPage;
