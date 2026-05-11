import { Breadcrumbs } from '@/components/Breadcrumbs';
import { DateRangeSelector } from '@/components/reports/components/DateRangeSelector';
import { useTicketsByCategoryReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import type { TicketByCategoryDto } from '@/types';
import { BaseButton, BaseTable } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { Card, CardContent, Spinner } from '@heroui/react';
import { Helmet } from '@modern-js/runtime/head';
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
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
        ? c.categoryName.slice(0, 20) + '…'
        : c.categoryName,
    total: c.total,
  }));

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

  return (
    <>
      <Helmet>
        <title>Tickets by Category - Helpdesk Reports</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Reports', href: '/reports-hub' },
            {
              label: 'Tickets by Category',
              href: '/reports/by-category',
              isCurrent: true,
            },
          ]}
        />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tickets by Category</h1>
          <p className="text-default-500 mt-1">
            Distribution of tickets across categories
          </p>
        </div>
        <BaseButton
          variant="bordered"
          onPress={handleExport}
          isDisabled={categories.length === 0}
          icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
        >
          Export XLSX
        </BaseButton>
      </div>

      <div className="mb-6">
        <DateRangeSelector
          startDate={startDate}
          endDate={endDate}
          onChange={(s, e) => {
            setStartDate(s);
            setEndDate(e);
          }}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold mb-4">Top 10 Categories</h2>
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
            </CardContent>
          </Card>
          <BaseTable table={table} isLoading={false} fullHeight={false} />
        </>
      )}
    </>
  );
}

export default TicketsByCategoryPage;
