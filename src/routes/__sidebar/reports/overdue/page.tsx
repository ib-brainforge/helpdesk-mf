import { Breadcrumbs } from '@/components/Breadcrumbs';
import { DateRangeSelector } from '@/components/reports/components/DateRangeSelector';
import { useOverdueTicketsReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import type { OverdueTicketDto } from '@/types';
import { BaseButton, BaseTable } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import { Spinner } from '@heroui/react';
import { Helmet } from '@modern-js/runtime/head';
import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

const PRIORITY_COLORS: Record<string, string> = {
  Critical: 'bg-danger-100 text-danger-800',
  High: 'bg-warning-100 text-warning-800',
  Normal: 'bg-default-100 text-default-800',
  Low: 'bg-default-50 text-default-600',
  None: 'bg-default-50 text-default-600',
};

function OverdueTicketsPage() {
  const timezone = useTimezone();
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: tickets = [], isLoading } = useOverdueTicketsReport(
    startDate,
    endDate,
  );

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const columns: ColumnDef<OverdueTicketDto, any>[] = useMemo(
    () => [
      {
        accessorKey: 'subject',
        header: 'Subject',
        cell: info => info.getValue() as string,
      },
      {
        accessorKey: 'assigneeId',
        header: 'Assignee',
        cell: info => {
          const id = info.getValue() as string | null;
          return id ? (
            <span className="font-mono text-xs">{id.slice(0, 8)}…</span>
          ) : (
            <span className="text-default-400">Unassigned</span>
          );
        },
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: info => {
          const p = info.getValue() as string;
          return (
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${PRIORITY_COLORS[p] ?? 'bg-default-100'}`}
            >
              {p}
            </span>
          );
        },
      },
      {
        accessorKey: 'daysOverdue',
        header: 'Days Overdue',
        cell: info => (
          <span className="font-semibold text-danger">
            {info.getValue() as number}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: info => formatDateTime(info.getValue() as string, { timezone }),
      },
    ],
    [timezone],
  );

  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleExport = () => {
    exportToXlsx(
      tickets.map(t => ({
        Subject: t.subject,
        AssigneeId: t.assigneeId ?? 'Unassigned',
        Priority: t.priority,
        'Days Overdue': t.daysOverdue,
        Created: formatDateTime(t.createdAt, { timezone }),
        'Due Date': formatDateTime(t.dueDate, { timezone }),
      })),
      'overdue-tickets',
    );
  };

  return (
    <>
      <Helmet>
        <title>Overdue Tickets - Helpdesk Reports</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Reports', href: '/reports-hub' },
            {
              label: 'Overdue Tickets',
              href: '/reports/overdue',
              isCurrent: true,
            },
          ]}
        />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Overdue Tickets</h1>
          <p className="text-default-500 mt-1">
            Tickets past their due date that are not yet resolved
          </p>
        </div>
        <BaseButton
          variant="bordered"
          onPress={handleExport}
          isDisabled={tickets.length === 0}
          icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
        >
          Export XLSX
        </BaseButton>
      </div>

      <div className="mb-6">
        <DateRangeSelector
          startDate={startDate}
          endDate={endDate}
          onChange={handleDateRangeChange}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <BaseTable table={table} isLoading={false} fullHeight={false} />
      )}
    </>
  );
}

export default OverdueTicketsPage;
