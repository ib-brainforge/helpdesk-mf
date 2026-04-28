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
import { useAssetsReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import type { AssetTicketDto } from '@/types';

type FlatRow = AssetTicketDto & { assetId: string };

function AssetsReportPage() {
  const timezone = useTimezone();
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: assets = [], isLoading } = useAssetsReport(startDate, endDate);

  const flatRows: FlatRow[] = useMemo(
    () =>
      assets.flatMap((a) =>
        a.tickets.map((t) => ({ ...t, assetId: a.assetId })),
      ),
    [assets],
  );

  const columns: ColumnDef<FlatRow, any>[] = useMemo(
    () => [
      {
        accessorKey: 'assetId',
        header: 'Asset ID',
        cell: (info) => (
          <span className="font-mono text-xs">{(info.getValue() as string).slice(0, 8)}…</span>
        ),
      },
      {
        accessorKey: 'subject',
        header: 'Subject',
        cell: (info) => <span className="font-medium">{info.getValue() as string}</span>,
      },
      { accessorKey: 'status', header: 'Status' },
      { accessorKey: 'priority', header: 'Priority' },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: (info) => (
          <span className="text-xs">{formatDateTime(info.getValue() as string, { timezone })}</span>
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
      flatRows.map((r) => ({
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
    <>
      <Helmet>
        <title>Assets Report - Helpdesk Reports</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Reports', href: '/reports-hub' },
            { label: 'Assets', href: '/reports/assets', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Assets Report</h1>
          <p className="text-default-500 mt-1">Tickets linked to assets grouped by asset</p>
        </div>
        <BaseButton
          variant="bordered"
          onPress={handleExport}
          isDisabled={flatRows.length === 0}
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
          {assets.length > 0 && (
            <p className="mb-3 text-sm text-default-500">
              {assets.length} asset{assets.length !== 1 ? 's' : ''} with {flatRows.length} linked ticket{flatRows.length !== 1 ? 's' : ''}
            </p>
          )}
          <BaseTable table={table} isLoading={false} fullHeight={false} />
        </>
      )}
    </>
  );
}

export default AssetsReportPage;
