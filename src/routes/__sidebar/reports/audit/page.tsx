import { useState, useMemo } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { BaseButton, BaseTable } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Pagination, Spinner } from '@heroui/react';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from '@tanstack/react-table';
import { DateRangeSelector } from '@/components/reports/components/DateRangeSelector';
import { useAuditLogReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import type { AuditLogEntryDto } from '@/types';

const PAGE_SIZE = 50;

function AuditLogPage() {
  const timezone = useTimezone();
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
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
        cell: (info) => (
          <span className="text-xs">{formatDateTime(info.getValue() as string, { timezone })}</span>
        ),
      },
      {
        accessorKey: 'entityDescription',
        header: 'Ticket',
        cell: (info) => (
          <span className="text-sm">{(info.getValue() as string | null) ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'entityType',
        header: 'Entity Type',
        cell: (info) => (
          <span className="text-xs text-default-500">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'actorUserId',
        header: 'Actor',
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
    data: entries,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const handleExport = () => {
    exportToXlsx(
      entries.map((e) => ({
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

  return (
    <>
      <Helmet>
        <title>Audit Log - Helpdesk Reports</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Reports', href: '/reports-hub' },
            { label: 'Audit Log', href: '/reports/audit', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audit Log</h1>
          <p className="text-default-500 mt-1">Complete activity and change history for tickets</p>
        </div>
        <BaseButton
          variant="bordered"
          onPress={handleExport}
          isDisabled={entries.length === 0}
          icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
        >
          Export XLSX
        </BaseButton>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <DateRangeSelector
          startDate={startDate}
          endDate={endDate}
          onChange={(s, e) => {
            setStartDate(s);
            setEndDate(e);
            setPage(1);
          }}
        />
        <input
          type="text"
          placeholder="Filter by user ID..."
          value={userId}
          onChange={(ev) => {
            setUserId(ev.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-default-200 rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          type="text"
          placeholder="Filter by event type..."
          value={eventType}
          onChange={(ev) => {
            setEventType(ev.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-default-200 rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <BaseTable table={table} isLoading={false} fullHeight={false} />
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination total={totalPages} page={page} onChange={setPage} showControls />
            </div>
          )}
          {report && (
            <p className="mt-2 text-xs text-default-400 text-center">
              Showing {entries.length} of {report.totalCount} entries
            </p>
          )}
        </>
      )}
    </>
  );
}

export default AuditLogPage;
