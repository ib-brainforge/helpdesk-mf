import { useDeletedTicketsReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import { useTimezone } from '@/security';
import type { DeletedTicketDto } from '@/types';
import { BaseButton } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
// Template: ListPage — table is the dominant content with no summary cards/charts.
import { BaseDateRangePicker } from '@brainforgeau/components/date-picker';
import { ListPage } from '@brainforgeau/components/page';
import { formatDateTime } from '@brainforgeau/components/utils';
import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

function DeletedTicketsPage() {
  const timezone = useTimezone();
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: tickets = [], isLoading } = useDeletedTicketsReport(
    startDate,
    endDate,
  );

  const columns: ColumnDef<DeletedTicketDto, any>[] = useMemo(
    () => [
      {
        accessorKey: 'subject',
        header: 'Subject',
        cell: info => (
          <span className="font-medium">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'entityDescription',
        header: 'Description',
        cell: info => (
          <span className="text-default-500 text-sm">
            {(info.getValue() as string | null) ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'deletedAt',
        header: 'Deleted At',
        cell: info => formatDateTime(info.getValue() as string, { timezone }),
      },
      {
        accessorKey: 'deletedByUserId',
        header: 'Deleted By',
        cell: info => (
          <span className="font-mono text-xs">
            {(info.getValue() as string).slice(0, 8)}…
          </span>
        ),
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
        cell: info => (
          <span className="text-default-500 text-sm">
            {(info.getValue() as string | null) ?? '—'}
          </span>
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
      tickets.map(t => ({
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
    <ListPage
      title="Deleted Tickets"
      breadcrumbsKey="reports.deleted"
      table={table}
      isLoading={isLoading}
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
            isDisabled={tickets.length === 0}
            icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
          >
            Export XLSX
          </BaseButton>
        </>
      }
    />
  );
}

export default DeletedTicketsPage;
