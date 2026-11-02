import { fetchAuditLog } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import type { AuditLogEntryDto } from '@/types';
import { toSortParam, withSortKeys } from '@/utils/listSort';
import { BaseButton, BaseInput } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import {
  DateRangeFilter,
  FilterField,
  ListPage,
  isoDateParam,
  textParam,
  useListPage,
} from '@brainforgeau/components/page';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';

// Template: ListPage — a server-paged table with filters is table-primary;
// no summary cards or charts, so ListPage is the correct framing.

const FILTER_CODECS = {
  from: isoDateParam(),
  to: isoDateParam(),
  userId: textParam(),
  eventType: textParam(),
};

/** Sortable columns by column id, with the key of `GET v1/reports/audit-log`'s `sort` each one sorts on. */
const SORT_KEYS = {
  occurredAt: 'occurredAt',
  entityDescription: 'entityDescription',
  reason: 'reason',
} as const;

const columnHelper = createColumnHelper<AuditLogEntryDto>();

function AuditLogPage() {
  const timezone = useTimezone();

  const columns = useMemo(
    () =>
      withSortKeys(
        [
          columnHelper.accessor('occurredAt', {
            header: 'Time',
            meta: { label: 'Time' },
            enableHiding: false,
            cell: info => (
              <span className="text-xs">
                {formatDateTime(info.getValue(), { timezone })}
              </span>
            ),
          }),
          columnHelper.accessor('entityDescription', {
            header: 'Ticket',
            meta: { label: 'Ticket' },
            cell: info => (
              <span className="text-sm">{info.getValue() ?? '—'}</span>
            ),
          }),
          columnHelper.accessor('entityType', {
            header: 'Entity Type',
            meta: { label: 'Entity Type' },
            cell: info => (
              <span className="text-xs text-default-500">
                {info.getValue()}
              </span>
            ),
          }),
          columnHelper.accessor('actorUserId', {
            header: 'Actor',
            meta: { label: 'Actor' },
            cell: info => (
              <span className="font-mono text-xs">
                {info.getValue().slice(0, 8)}…
              </span>
            ),
          }),
          columnHelper.accessor('reason', {
            header: 'Reason',
            meta: { label: 'Reason' },
            cell: info => (
              <span className="text-default-500 text-sm">
                {info.getValue() ?? '—'}
              </span>
            ),
          }),
        ] as ColumnDef<AuditLogEntryDto, any>[],
        SORT_KEYS,
      ),
    [timezone],
  );

  const list = useListPage<AuditLogEntryDto, typeof FILTER_CODECS>({
    listId: 'helpdesk.audit-log',
    queryKey: ['reports', 'audit-log'],
    columns,
    initialPageSize: 50,
    filters: FILTER_CODECS,
    getRowId: row => row.id,
    queryFn: ({ pageIndex, pageSize, sorting, listFilters }) =>
      fetchAuditLog({
        fromDate: listFilters.from || undefined,
        toDate: listFilters.to || undefined,
        userId: listFilters.userId || undefined,
        eventType: listFilters.eventType || undefined,
        page: pageIndex + 1,
        pageSize,
        sort: toSortParam(sorting, SORT_KEYS),
      }),
  });

  const { rows, filters, setFilter } = list;

  const handleExport = () => {
    exportToXlsx(
      rows.map(e => ({
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
    <ListPage
      title="Audit Log"
      breadcrumbsKey="reports.audit"
      description="Shows the last 30 days unless you set a date range."
      list={list}
      personalise
      countNoun={{ one: 'entry', other: 'entries' }}
      loadError={list.isError ? list.error : undefined}
      onRetry={() => void list.refetch()}
      actions={
        <BaseButton
          variant="bordered"
          color="light"
          onPress={handleExport}
          isDisabled={rows.length === 0}
          icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
        >
          Export XLSX
        </BaseButton>
      }
      filters={
        <>
          <DateRangeFilter
            label="Date range"
            from={filters.from}
            to={filters.to}
            onFromChange={value => setFilter('from', value)}
            onToChange={value => setFilter('to', value)}
          />
          <FilterField label="User ID">
            <BaseInput
              aria-label="Filter by user ID"
              placeholder="Filter by user ID..."
              value={filters.userId}
              onChange={ev => setFilter('userId', ev.target.value)}
              className="w-48"
            />
          </FilterField>
          <FilterField label="Event type">
            <BaseInput
              aria-label="Filter by event type"
              placeholder="Filter by event type..."
              value={filters.eventType}
              onChange={ev => setFilter('eventType', ev.target.value)}
              className="w-48"
            />
          </FilterField>
        </>
      }
    />
  );
}

export default AuditLogPage;
