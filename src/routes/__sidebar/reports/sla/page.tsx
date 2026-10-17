import { AppLoadingSplash } from '@/components/AppSplash';
import { useSlaComplianceReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import { SummaryCard } from '@/components/shared';
import type { SlaPolicyComplianceDto } from '@/types';
import { BaseButton, BaseTable } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
// Template: DashboardPage — summary cards + table in children (no chart section).
// DashboardPage is chosen over ListPage because summary KPI cards + table both
// appear on the page; ListPage is table-primary only.
import { BaseDateRangePicker } from '@brainforgeau/components/date-picker';
import { DashboardPage, EmptyState } from '@brainforgeau/components/page';
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

function SlaCompliancePage() {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0],
  );

  const { data: compliance, isLoading } = useSlaComplianceReport(
    startDate,
    endDate,
  );

  const columns: ColumnDef<SlaPolicyComplianceDto, any>[] = useMemo(
    () => [
      { accessorKey: 'policyName', header: 'SLA Policy' },
      {
        accessorKey: 'totalBreaches',
        header: 'Total Breaches',
        cell: info => (
          <span className="font-semibold text-danger">
            {info.getValue() as number}
          </span>
        ),
      },
      { accessorKey: 'responseBreaches', header: 'Response Breaches' },
      { accessorKey: 'resolutionBreaches', header: 'Resolution Breaches' },
    ],
    [],
  );

  const table = useReactTable({
    data: compliance?.byPolicy ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleExport = () => {
    if (!compliance) return;
    exportToXlsx(
      compliance.byPolicy.map(p => ({
        'SLA Policy': p.policyName,
        'Total Breaches': p.totalBreaches,
        'Response Breaches': p.responseBreaches,
        'Resolution Breaches': p.resolutionBreaches,
      })),
      'sla-compliance',
    );
  };

  if (isLoading) return <AppLoadingSplash />;

  if (!compliance) {
    return (
      <DashboardPage
        title="SLA Compliance"
        breadcrumbsKey="reports.sla"
        actions={
          <BaseDateRangePicker
            value={{ start: new Date(startDate), end: new Date(endDate) }}
            onChange={({ start, end }) => {
              setStartDate(start.toISOString().split('T')[0]);
              setEndDate(end.toISOString().split('T')[0]);
            }}
          />
        }
      >
        <EmptyState title="No SLA data available" live />
      </DashboardPage>
    );
  }

  return (
    <DashboardPage
      title="SLA Compliance"
      breadcrumbsKey="reports.sla"
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
            color="light"
            onPress={handleExport}
            isDisabled={!compliance || compliance.byPolicy.length === 0}
            icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
          >
            Export XLSX
          </BaseButton>
        </>
      }
      summary={
        <>
          <SummaryCard
            title="Total Tickets"
            value={compliance.totalTickets}
            icon="ticket"
            variant="default"
          />
          <SummaryCard
            title="Within SLA"
            value={compliance.withinSla}
            icon="check-circle"
            variant="success"
          />
          <SummaryCard
            title="SLA Breached"
            value={compliance.breachedSla}
            icon="x-circle"
            variant="danger"
          />
          <SummaryCard
            title="Compliance Rate"
            value={`${compliance.compliancePercentage.toFixed(1)}%`}
            icon="chart-bar"
            variant={
              compliance.compliancePercentage >= 90 ? 'success' : 'warning'
            }
          />
        </>
      }
    >
      <p className="mb-4 text-lg font-semibold">Breaches by Policy</p>
      <BaseTable table={table} isLoading={false} fullHeight={false} />
    </DashboardPage>
  );
}

export default SlaCompliancePage;
