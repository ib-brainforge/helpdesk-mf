import { useState } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { BaseButton, BaseTable } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Card, CardBody, Spinner } from '@heroui/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from '@tanstack/react-table';
import { DateRangeSelector } from '@/components/reports/components/DateRangeSelector';
import { useTicketsByPriorityReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import type { TicketByPriorityDto } from '@/types';

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
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: priorities = [], isLoading } = useTicketsByPriorityReport(startDate, endDate);

  const chartData = priorities.map((p) => ({
    name: p.priority,
    total: p.total,
    fill: PRIORITY_COLORS[p.priority] ?? '#9ca3af',
  }));

  const columns: ColumnDef<TicketByPriorityDto, any>[] = [
    { accessorKey: 'priority', header: 'Priority' },
    {
      accessorKey: 'total',
      header: 'Total Tickets',
      cell: (info) => <span className="font-semibold">{info.getValue() as number}</span>,
    },
  ];

  const table = useReactTable({
    data: priorities,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleExport = () => {
    exportToXlsx(
      priorities.map((p) => ({
        Priority: p.priority,
        Total: p.total,
        ...Object.fromEntries(Object.entries(p.byStatus).map(([k, v]) => [`Status: ${k}`, v])),
      })),
      'tickets-by-priority',
    );
  };

  return (
    <>
      <Helmet>
        <title>Tickets by Priority - Helpdesk Reports</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Reports', href: '/reports-hub' },
            { label: 'Tickets by Priority', href: '/reports/by-priority', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tickets by Priority</h1>
          <p className="text-default-500 mt-1">Breakdown of tickets across priority levels</p>
        </div>
        <BaseButton
          variant="bordered"
          onPress={handleExport}
          isDisabled={priorities.length === 0}
          icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
        >
          Export XLSX
        </BaseButton>
      </div>

      <div className="mb-6">
        <DateRangeSelector startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <>
          <Card className="mb-6">
            <CardBody className="p-4">
              <h2 className="text-sm font-semibold mb-4">Priority Distribution</h2>
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
            </CardBody>
          </Card>
          <BaseTable table={table} isLoading={false} fullHeight={false} />
        </>
      )}
    </>
  );
}

export default TicketsByPriorityPage;
