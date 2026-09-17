import { useAgentUtilizationReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import type { AgentUtilizationDto } from '@/types';
import { BaseButton } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
// Template: ListPage — table is the dominant content with no summary cards/charts.
import { BaseDateRangePicker } from '@brainforgeau/components/date-picker';
import { ListPage } from '@brainforgeau/components/page';
import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

const formatMinutes = (m: number | null) => {
  if (m == null) return 'N/A';
  if (m < 60) return `${Math.round(m)}m`;
  return `${(m / 60).toFixed(1)}h`;
};

function AgentUtilizationPage() {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: agents = [], isLoading } = useAgentUtilizationReport(
    startDate,
    endDate,
  );

  const columns: ColumnDef<AgentUtilizationDto, any>[] = useMemo(
    () => [
      {
        accessorKey: 'agentId',
        header: 'Agent',
        cell: info => (
          <span className="font-mono text-xs">
            {(info.getValue() as string).slice(0, 8)}…
          </span>
        ),
      },
      {
        accessorKey: 'ticketsAssigned',
        header: 'Assigned',
        cell: info => (
          <span className="font-semibold">{info.getValue() as number}</span>
        ),
      },
      { accessorKey: 'ticketsResolved', header: 'Resolved' },
      { accessorKey: 'currentOpen', header: 'Current Open' },
      {
        accessorKey: 'avgResolutionMinutes',
        header: 'Avg Resolution',
        cell: info => formatMinutes(info.getValue() as number | null),
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
      agents.map(a => ({
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
    <ListPage
      title="Agent Utilization"
      breadcrumbsKey="reports.utilization"
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
            isDisabled={agents.length === 0}
            icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
          >
            Export XLSX
          </BaseButton>
        </>
      }
    />
  );
}

export default AgentUtilizationPage;
