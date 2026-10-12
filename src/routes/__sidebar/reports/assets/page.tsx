import { useAssetsReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import { useTimezone } from '@/security';
import type { AssetTicketDto } from '@/types';
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

type FlatRow = AssetTicketDto & { assetId: string };

function AssetsReportPage() {
  const timezone = useTimezone();
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: assets = [], isLoading } = useAssetsReport(startDate, endDate);

  const flatRows: FlatRow[] = useMemo(
    () =>
      assets.flatMap(a => a.tickets.map(t => ({ ...t, assetId: a.assetId }))),
    [assets],
  );

  const columns: ColumnDef<FlatRow, any>[] = useMemo(
    () => [
      {
        accessorKey: 'assetId',
        header: 'Asset ID',
        cell: info => (
          <span className="font-mono text-xs">
            {(info.getValue() as string).slice(0, 8)}…
          </span>
        ),
      },
      {
        accessorKey: 'subject',
        header: 'Subject',
        cell: info => (
          <span className="font-medium">{info.getValue() as string}</span>
        ),
      },
      { accessorKey: 'status', header: 'Status' },
      { accessorKey: 'priority', header: 'Priority' },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: info => (
          <span className="text-xs">
            {formatDateTime(info.getValue() as string, { timezone })}
          </span>
        ),
      },
    ],
    [timezone],
  );

  const table = useReactTable({
    data: flatRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleExport = () => {
    exportToXlsx(
      flatRows.map(r => ({
        'Asset ID': r.assetId,
        Subject: r.subject,
        Status: r.status,
        Priority: r.priority,
        'Created At': r.createdAt,
      })),
      'assets-report',
    );
  };

  return (
    <ListPage
      title="Assets Report"
      breadcrumbsKey="reports.assets"
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
            isDisabled={flatRows.length === 0}
            icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
          >
            Export XLSX
          </BaseButton>
        </>
      }
    />
  );
}

export default AssetsReportPage;
