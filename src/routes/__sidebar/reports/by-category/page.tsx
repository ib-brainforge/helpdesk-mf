import { DateRangeSelector } from '@/components/reports/components/DateRangeSelector';
import { useTicketsByCategoryReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import { SummaryCard } from '@/components/shared';
import type { TicketByCategoryDto } from '@/types';
import { BaseButton, BaseTable } from '@brainforgeau/components';
import { LoadingSplash } from '@brainforgeau/components';
import { Box } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function TicketsByCategoryPage() {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0],
  );

  const { data: categories = [], isLoading } = useTicketsByCategoryReport(
    startDate,
    endDate,
  );

  const chartData = categories.slice(0, 10).map(c => ({
    name:
      c.categoryName.length > 20
        ? `${c.categoryName.slice(0, 20)}…`
        : c.categoryName,
    total: c.total,
  }));

  const totalTickets = useMemo(
    () => categories.reduce((sum, c) => sum + c.total, 0),
    [categories],
  );

  const topCategory = useMemo(
    () =>
      categories.length > 0
        ? categories.reduce((a, b) => (a.total > b.total ? a : b)).categoryName
        : '—',
    [categories],
  );

  const columns: ColumnDef<TicketByCategoryDto, any>[] = [
    {
      accessorKey: 'categoryName',
      header: 'Category',
    },
    {
      accessorKey: 'total',
      header: 'Total Tickets',
      cell: info => (
        <span className="font-semibold">{info.getValue() as number}</span>
      ),
    },
  ];

  const table = useReactTable({
    data: categories,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleExport = () => {
    exportToXlsx(
      categories.map(c => ({
        Category: c.categoryName,
        Total: c.total,
        ...Object.fromEntries(
          Object.entries(c.byStatus).map(([k, v]) => [`Status: ${k}`, v]),
        ),
      })),
      'tickets-by-category',
    );
  };

  if (isLoading) return <LoadingSplash />;

  return (
    <DashboardPage
      title="Tickets by Category"
      breadcrumbsKey="reports.by-category"
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
            isDisabled={categories.length === 0}
            icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
          >
            Export XLSX
          </BaseButton>
        </>
      }
      summary={
        <>
          <SummaryCard
            title="Total Categories"
            value={categories.length}
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
            title="Top Category"
            value={topCategory}
            icon="trophy"
            variant="warning"
          />
          <SummaryCard
            title="Showing Top"
            value={`${Math.min(chartData.length, 10)} of ${categories.length}`}
            icon="chart-bar"
            variant="default"
          />
        </>
      }
      charts={
        <Box title="Top 10 Categories">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={160}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(v: number) => `${v} tickets`} />
                <Bar dataKey="total" fill="#8b5cf6" name="Tickets" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No category data" size="sm" />
          )}
        </Box>
      }
    >
      <BaseTable table={table} isLoading={false} fullHeight={false} />
    </DashboardPage>
  );
}

export default TicketsByCategoryPage;
