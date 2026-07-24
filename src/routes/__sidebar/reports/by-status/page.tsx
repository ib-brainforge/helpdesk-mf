import { AppLoadingSplash } from '@/components/AppSplash';
import { DateRangeSelector } from '@/components/reports/components/DateRangeSelector';
import { useTicketsByStatusReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import { SummaryCard } from '@/components/shared';
import type { TicketByStatusDto } from '@/types';
import { BaseButton, BaseTable } from '@brainforgeau/components';
import { Box, Icon } from '@brainforgeau/components/base';
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

function TicketsByStatusPage() {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0],
  );

  const { data: statuses = [], isLoading } = useTicketsByStatusReport(
    startDate,
    endDate,
  );

  const totalTickets = useMemo(
    () => statuses.reduce((sum, s) => sum + s.total, 0),
    [statuses],
  );

  const topStatus = useMemo(
    () =>
      statuses.length > 0
        ? statuses.reduce((a, b) => (a.total > b.total ? a : b)).status
        : '—',
    [statuses],
  );

  const columns: ColumnDef<TicketByStatusDto, any>[] = [
    { accessorKey: 'status', header: 'Status' },
    {
      accessorKey: 'total',
      header: 'Total Tickets',
      cell: info => (
        <span className="font-semibold">{info.getValue() as number}</span>
      ),
    },
  ];

  const table = useReactTable({
    data: statuses,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleExport = () => {
    exportToXlsx(
      statuses.map(s => ({
        Status: s.status,
        Total: s.total,
        ...Object.fromEntries(
          Object.entries(s.byPriority).map(([k, v]) => [`Priority: ${k}`, v]),
        ),
      })),
      'tickets-by-status',
    );
  };

  if (isLoading) return <AppLoadingSplash />;

  return (
    <DashboardPage
      title="Tickets by Status"
      breadcrumbsKey="reports.by-status"
      actions={
        <>
          <DateRangeSelector
            startDate={startDate}
            endDate={endDate}
            onChange={(s, e) => {
              setStartDate(s);
              setEndDate(e);
            }}
          />
          <BaseButton
            variant="bordered"
            onPress={handleExport}
            isDisabled={statuses.length === 0}
            icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
          >
            Export XLSX
          </BaseButton>
        </>
      }
      summary={
        <>
          <SummaryCard
            title="Total Statuses"
            value={statuses.length}
            icon="squares-2x2"
            variant="info"
          />
          <SummaryCard
            title="Total Tickets"
            value={totalTickets}
            icon="ticket"
            variant="default"
          />
          <SummaryCard
            title="Top Status"
            value={topStatus}
            icon="trophy"
            variant="warning"
          />
          <SummaryCard
            title="Date Range"
            value="30 days"
            icon="calendar"
            variant="default"
          />
        </>
      }
      charts={
        <Box title="Status Distribution">
          {statuses.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={statuses.map(s => ({ name: s.status, total: s.total }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v: number) => `${v} tickets`} />
                <Legend />
                <Bar dataKey="total" name="Tickets" fill="#0070f3" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No status data" size="sm" />
          )}
        </Box>
      }
    >
      <BaseTable table={table} isLoading={false} fullHeight={false} />
    </DashboardPage>
  );
}

export default TicketsByStatusPage;
