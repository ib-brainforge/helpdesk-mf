import { useState, useMemo } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { BaseButton, BaseTable } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Spinner } from '@heroui/react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { DateRangeSelector } from '@/components/reports/components/DateRangeSelector';
import { useAgentUtilizationReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import type { AgentUtilizationDto } from '@/types';

const formatMinutes = (m: number | null) => {
  if (m == null) return 'N/A';
  if (m < 60) return `${Math.round(m)}m`;
  return `${(m / 60).toFixed(1)}h`;
};

function AgentUtilizationPage() {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: agents = [], isLoading } = useAgentUtilizationReport(startDate, endDate);

  const columns: ColumnDef<AgentUtilizationDto, any>[] = useMemo(
    () => [
      {
        accessorKey: 'agentId',
        header: 'Agent',
        cell: (info) => (
          <span className="font-mono text-xs">{(info.getValue() as string).slice(0, 8)}…</span>
        ),
      },
      {
        accessorKey: 'ticketsAssigned',
        header: 'Assigned',
        cell: (info) => <span className="font-semibold">{info.getValue() as number}</span>,
      },
      { accessorKey: 'ticketsResolved', header: 'Resolved' },
      { accessorKey: 'currentOpen', header: 'Current Open' },
      {
        accessorKey: 'avgResolutionMinutes',
        header: 'Avg Resolution',
        cell: (info) => formatMinutes(info.getValue() as number | null),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: agents,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleExport = () => {
    exportToXlsx(
      agents.map((a) => ({
        AgentId: a.agentId,
        Assigned: a.ticketsAssigned,
        Resolved: a.ticketsResolved,
        'Current Open': a.currentOpen,
        'Avg Resolution': formatMinutes(a.avgResolutionMinutes),
      })),
      'agent-utilization',
    );
  };

  return (
    <>
      <Helmet>
        <title>Agent Utilization - Helpdesk Reports</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Reports', href: '/reports-hub' },
            { label: 'Agent Utilization', href: '/reports/utilization', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agent Utilization</h1>
          <p className="text-default-500 mt-1">Workload distribution and capacity per agent</p>
        </div>
        <BaseButton
          variant="bordered"
          onPress={handleExport}
          isDisabled={agents.length === 0}
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
        <BaseTable table={table} isLoading={false} fullHeight={false} />
      )}
    </>
  );
}

export default AgentUtilizationPage;
