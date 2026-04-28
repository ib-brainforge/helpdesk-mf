import { useState, useMemo } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { BaseButton, BaseTable } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Card, CardBody, Spinner } from '@heroui/react';
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from '@tanstack/react-table';
import { DateRangeSelector } from '@/components/reports/components/DateRangeSelector';
import { useSlaComplianceReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import type { SlaPolicyComplianceDto } from '@/types';

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card>
      <CardBody className="p-4">
        <p className="text-xs text-default-500 mb-1">{label}</p>
        <p className={`text-2xl font-semibold ${color ?? ''}`}>{value}</p>
      </CardBody>
    </Card>
  );
}

function SlaCompliancePage() {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: compliance, isLoading } = useSlaComplianceReport(startDate, endDate);

  const columns: ColumnDef<SlaPolicyComplianceDto, any>[] = useMemo(
    () => [
      { accessorKey: 'policyName', header: 'SLA Policy' },
      {
        accessorKey: 'totalBreaches',
        header: 'Total Breaches',
        cell: (info) => <span className="font-semibold text-danger">{info.getValue() as number}</span>,
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
      compliance.byPolicy.map((p) => ({
        'SLA Policy': p.policyName,
        'Total Breaches': p.totalBreaches,
        'Response Breaches': p.responseBreaches,
        'Resolution Breaches': p.resolutionBreaches,
      })),
      'sla-compliance',
    );
  };

  return (
    <>
      <Helmet>
        <title>SLA Compliance - Helpdesk Reports</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Reports', href: '/reports-hub' },
            { label: 'SLA Compliance', href: '/reports/sla', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SLA Compliance</h1>
          <p className="text-default-500 mt-1">Track SLA adherence and breaches by policy</p>
        </div>
        <BaseButton
          variant="bordered"
          onPress={handleExport}
          isDisabled={!compliance || compliance.byPolicy.length === 0}
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
      ) : compliance ? (
        <>
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Tickets" value={compliance.totalTickets} />
            <StatCard label="Within SLA" value={compliance.withinSla} color="text-success" />
            <StatCard label="SLA Breached" value={compliance.breachedSla} color="text-danger" />
            <StatCard
              label="Compliance Rate"
              value={`${compliance.compliancePercentage.toFixed(1)}%`}
              color={compliance.compliancePercentage >= 90 ? 'text-success' : 'text-warning'}
            />
          </div>
          <h2 className="text-lg font-semibold mb-4">Breaches by Policy</h2>
          <BaseTable table={table} isLoading={false} fullHeight={false} />
        </>
      ) : (
        <p className="text-default-500">No SLA data available.</p>
      )}
    </>
  );
}

export default SlaCompliancePage;
