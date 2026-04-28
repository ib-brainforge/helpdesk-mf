import { useState, useMemo } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { BaseButton, BaseTable } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Spinner } from '@heroui/react';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { DateRangeSelector } from '@/components/reports/components/DateRangeSelector';
import { useDeletedTicketsReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import type { DeletedTicketDto } from '@/types';

function DeletedTicketsPage() {
  const timezone = useTimezone();
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: tickets = [], isLoading } = useDeletedTicketsReport(startDate, endDate);

  const columns: ColumnDef<DeletedTicketDto, any>[] = useMemo(
    () => [
      {
        accessorKey: 'subject',
        header: 'Subject',
        cell: (info) => <span className="font-medium">{info.getValue() as string}</span>,
      },
      {
        accessorKey: 'entityDescription',
        header: 'Description',
        cell: (info) => (
          <span className="text-default-500 text-sm">{(info.getValue() as string | null) ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'deletedAt',
        header: 'Deleted At',
        cell: (info) => formatDateTime(info.getValue() as string, { timezone }),
      },
      {
        accessorKey: 'deletedByUserId',
        header: 'Deleted By',
        cell: (info) => (
          <span className="font-mono text-xs">{(info.getValue() as string).slice(0, 8)}…</span>
        ),
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
        cell: (info) => (
          <span className="text-default-500 text-sm">{(info.getValue() as string | null) ?? '—'}</span>
        ),
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
      tickets.map((t) => ({
        Subject: t.subject,
        Description: t.entityDescription ?? '',
        'Deleted At': t.deletedAt,
        'Deleted By': t.deletedByUserId,
        Reason: t.reason ?? '',
      })),
      'deleted-tickets',
    );
  };

  return (
    <>
      <Helmet>
        <title>Deleted Tickets - Helpdesk Reports</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Reports', href: '/reports-hub' },
            { label: 'Deleted Tickets', href: '/reports/deleted', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Deleted Tickets</h1>
          <p className="text-default-500 mt-1">Audit trail of soft-deleted tickets</p>
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
        <BaseTable table={table} isLoading={false} fullHeight={false} />
      )}
    </>
  );
}

export default DeletedTicketsPage;
