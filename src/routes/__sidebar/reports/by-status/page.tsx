import { useState } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { BaseButton, BaseTable } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Card, CardContent, Spinner } from '@heroui/react';
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
import { useTicketsByStatusReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import type { TicketByStatusDto } from '@/types';

function TicketsByStatusPage() {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: statuses = [], isLoading } = useTicketsByStatusReport(startDate, endDate);

  const columns: ColumnDef<TicketByStatusDto, any>[] = [
    { accessorKey: 'status', header: 'Status' },
    {
      accessorKey: 'total',
      header: 'Total Tickets',
      cell: (info) => <span className="font-semibold">{info.getValue() as number}</span>,
    },
  ];

  const table = useReactTable({
    data: statuses,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleExport = () => {
    exportToXlsx(
      statuses.map((s) => ({
        Status: s.status,
        Total: s.total,
        ...Object.fromEntries(Object.entries(s.byPriority).map(([k, v]) => [`Priority: ${k}`, v])),
      })),
      'tickets-by-status',
    );
  };

  return (
    <>
      <Helmet>
        <title>Tickets by Status - Helpdesk Reports</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Reports', href: '/reports-hub' },
            { label: 'Tickets by Status', href: '/reports/by-status', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tickets by Status</h1>
          <p className="text-default-500 mt-1">Current status distribution across all tickets</p>
        </div>
        <BaseButton
          variant="bordered"
          onPress={handleExport}
          isDisabled={statuses.length === 0}
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
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold mb-4">Status Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statuses.map((s) => ({ name: s.status, total: s.total }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => `${v} tickets`} />
                  <Legend />
                  <Bar dataKey="total" name="Tickets" fill="#0070f3" />
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

export default TicketsByStatusPage;
