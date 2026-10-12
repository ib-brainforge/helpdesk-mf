import { useAuditLogReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import { useTimezone } from '@/security';
import type { AuditLogEntryDto } from '@/types';
import { BaseButton, BaseInput } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
// Template: ListPage — table with server-side pagination and filters is table-primary;
// no summary cards or charts, so ListPage is the correct framing.
import { BaseDateRangePicker } from '@brainforgeau/components/date-picker';
import { ListPage } from '@brainforgeau/components/page';
import { formatDateTime } from '@brainforgeau/components/utils';
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

const PAGE_SIZE = 50;

function AuditLogPage() {
  const timezone = useTimezone();
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [eventType, setEventType] = useState('');

  const { data: report, isLoading } = useAuditLogReport({
    fromDate: startDate,
    toDate: endDate,
    page,
    pageSize: PAGE_SIZE,
    userId: userId || undefined,
    eventType: eventType || undefined,
  });

  const entries = report?.items ?? [];
  const totalPages = report ? Math.ceil(report.totalCount / PAGE_SIZE) : 1;

  const columns: ColumnDef<AuditLogEntryDto, any>[] = useMemo(
    () => [
      {
        accessorKey: 'occurredAt',
        header: 'Time',
        cell: info => (
          <span className="text-xs">
            {formatDateTime(info.getValue() as string, { timezone })}
          </span>
        ),
      },
      {
        accessorKey: 'entityDescription',
        header: 'Ticket',
        cell: info => (
          <span className="text-sm">
            {(info.getValue() as string | null) ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'entityType',
        header: 'Entity Type',
        cell: info => (
          <span className="text-xs text-default-500">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'actorUserId',
        header: 'Actor',
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
    data: entries,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: {
      pagination: { pageIndex: page - 1, pageSize: PAGE_SIZE },
    },
    onPaginationChange: updater => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: page - 1, pageSize: PAGE_SIZE })
          : updater;
      setPage(next.pageIndex + 1);
    },
  });

  const handleExport = () => {
    exportToXlsx(
      entries.map(e => ({
        Time: e.occurredAt,
        Ticket: e.entityDescription ?? '',
        'Entity Type': e.entityType,
        'Entity ID': e.entityId,
        Actor: e.actorUserId,
        Reason: e.reason ?? '',
      })),
      'audit-log',
    );
  };

  const hasActiveFilters = !!userId || !!eventType;

  return (
    <ListPage
      title="Audit Log"
      breadcrumbsKey="reports.audit"
      table={table}
      isLoading={isLoading}
      actions={
        <BaseButton
          variant="bordered"
          onPress={handleExport}
          isDisabled={entries.length === 0}
          icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
        >
          Export XLSX
        </BaseButton>
      }
      filters={
        <>
          <BaseDateRangePicker
            value={{ start: new Date(startDate), end: new Date(endDate) }}
            onChange={({ start, end }) => {
              setStartDate(start.toISOString().split('T')[0]);
              setEndDate(end.toISOString().split('T')[0]);
              setPage(1);
            }}
          />
          <BaseInput
            placeholder="Filter by user ID..."
            value={userId}
            onChange={ev => {
              setUserId(ev.target.value);
              setPage(1);
            }}
            className="w-48"
          />
          <BaseInput
            placeholder="Filter by event type..."
            value={eventType}
            onChange={ev => {
              setEventType(ev.target.value);
              setPage(1);
            }}
            className="w-48"
          />
        </>
      }
      hasActiveFilters={hasActiveFilters}
      onClearFilters={() => {
        setUserId('');
        setEventType('');
        setPage(1);
      }}
    />
  );
}

export default AuditLogPage;
