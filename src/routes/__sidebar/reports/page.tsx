import { useState, useMemo } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { Tabs, Tab, Card, DateRangePicker, Select, SelectItem } from '@heroui/react';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { BaseTable } from '@brainforgeau/components';
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  useTicketSummaryReport,
  useDynamicsReport,
  useTechPerformanceReport,
} from '@/components/reports/hooks/useReports';
import {
  StatusPieChart,
  PriorityBarChart,
  TrendLineChart,
  CategoryBarChart,
  ResolutionTimeChart,
} from '@/components/reports/components/charts';
import { ReportGranularity, type TechPerformanceDto } from '@/types';

function ReportsPage() {
  const [selectedTab, setSelectedTab] = useState('summary');
  const [granularity, setGranularity] = useState<ReportGranularity>(ReportGranularity.Daily);

  // REVIEW: Using local state for date range - will integrate with DateRangePicker
  const [startDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  );
  const [endDate] = useState(new Date().toISOString());

  const { data: summaryData, isLoading: loadingSummary } = useTicketSummaryReport(
    startDate,
    endDate,
  );
  const { data: dynamicsData, isLoading: loadingDynamics } = useDynamicsReport(
    startDate,
    endDate,
    granularity,
  );
  const { data: techPerformance, isLoading: loadingTechPerf } = useTechPerformanceReport(
    startDate,
    endDate,
  );

  // Tech Performance Table
  const techColumns: ColumnDef<TechPerformanceDto, any>[] = useMemo(
    () => [
      {
        accessorKey: 'technicianName',
        header: 'Technician',
        cell: (info) => info.getValue() as string,
      },
      {
        accessorKey: 'assignedCount',
        header: 'Assigned',
        cell: (info) => info.getValue() as number,
      },
      {
        accessorKey: 'resolvedCount',
        header: 'Resolved',
        cell: (info) => info.getValue() as number,
      },
      {
        accessorKey: 'averageResolutionTimeHours',
        header: 'Avg Resolution',
        cell: (info) => `${(info.getValue() as number).toFixed(1)}h`,
      },
      {
        accessorKey: 'averageFirstResponseTimeHours',
        header: 'First Response',
        cell: (info) => `${(info.getValue() as number).toFixed(1)}h`,
      },
      {
        accessorKey: 'p50ResolutionTimeHours',
        header: 'P50',
        cell: (info) => `${(info.getValue() as number).toFixed(1)}h`,
      },
      {
        accessorKey: 'p90ResolutionTimeHours',
        header: 'P90',
        cell: (info) => `${(info.getValue() as number).toFixed(1)}h`,
      },
    ],
    [],
  );

  const techTable = useReactTable({
    data: techPerformance?.technicians || [],
    columns: techColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <Helmet>
        <title>Reports Dashboard</title>
      </Helmet>

      <div className="mb-5">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Reports Dashboard</h1>
          <BaseButton
            variant="light"
            icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
          >
            Export
          </BaseButton>
        </div>

        <Tabs selectedKey={selectedTab} onSelectionChange={(key) => setSelectedTab(key as string)}>
          {/* Summary Tab */}
          <Tab key="summary" title="Summary">
            <div className="mt-4 space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card className="p-4">
                  <p className="text-sm text-gray-600">Total Created</p>
                  <p className="text-3xl font-bold">{summaryData?.totalCreated || 0}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-gray-600">Total Closed</p>
                  <p className="text-3xl font-bold text-success">
                    {summaryData?.totalClosed || 0}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-gray-600">Total Open</p>
                  <p className="text-3xl font-bold text-warning">{summaryData?.totalOpen || 0}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-gray-600">Avg Resolution Time</p>
                  <p className="text-3xl font-bold">
                    {summaryData?.averageResolutionTimeHours.toFixed(1) || 0}h
                  </p>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="p-4">
                  <h3 className="mb-4 text-lg font-semibold">By Status</h3>
                  {summaryData?.byStatus && <StatusPieChart data={summaryData.byStatus} />}
                </Card>

                <Card className="p-4">
                  <h3 className="mb-4 text-lg font-semibold">By Priority</h3>
                  {summaryData?.byPriority && <PriorityBarChart data={summaryData.byPriority} />}
                </Card>

                <Card className="p-4 lg:col-span-2">
                  <h3 className="mb-4 text-lg font-semibold">Top Categories</h3>
                  {summaryData?.byCategory && <CategoryBarChart data={summaryData.byCategory} />}
                </Card>
              </div>
            </div>
          </Tab>

          {/* Dynamics Tab */}
          <Tab key="dynamics" title="Dynamics">
            <div className="mt-4 space-y-6">
              {/* Filters */}
              <div className="flex gap-4">
                <Select
                  label="Granularity"
                  selectedKeys={[granularity.toString()]}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0] as string;
                    setGranularity(parseInt(key, 10));
                  }}
                  className="w-48"
                >
                  <SelectItem key={ReportGranularity.Daily.toString()}>
                    Daily
                  </SelectItem>
                  <SelectItem key={ReportGranularity.Weekly.toString()}>
                    Weekly
                  </SelectItem>
                  <SelectItem key={ReportGranularity.Monthly.toString()}>
                    Monthly
                  </SelectItem>
                </Select>
              </div>

              {/* Charts */}
              <Card className="p-4">
                <h3 className="mb-4 text-lg font-semibold">Ticket Trends</h3>
                {dynamicsData?.dataPoints && <TrendLineChart data={dynamicsData.dataPoints} />}
              </Card>

              <Card className="p-4">
                <h3 className="mb-4 text-lg font-semibold">Average Resolution Time</h3>
                {dynamicsData?.dataPoints && (
                  <ResolutionTimeChart data={dynamicsData.dataPoints} />
                )}
              </Card>
            </div>
          </Tab>

          {/* Custom Tab */}
          <Tab key="custom" title="Custom">
            <div className="mt-4">
              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">Custom Report Builder</h3>
                <p className="text-gray-600">
                  Custom report builder will be implemented here with column selector, filter
                  builder, and export functionality.
                </p>
                {/* TODO: Implement custom report builder UI */}
              </Card>
            </div>
          </Tab>

          {/* Tech Performance Tab */}
          <Tab key="tech-performance" title="Tech Performance">
            <div className="mt-4">
              <BaseTable
                table={techTable}
                isLoading={loadingTechPerf}
                loading={{ title: 'Loading technician performance...' }}
                fullHeight
              />
            </div>
          </Tab>
        </Tabs>
      </div>
    </>
  );
}

export default ReportsPage;
