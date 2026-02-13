import { useState, useMemo } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { useNavigate } from '@modern-js/runtime/router';
import { Tabs, Tab, Card, Select, SelectItem } from '@heroui/react';
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
import { CustomReportBuilder } from '@/components/reports/components/CustomReportBuilder';
import { DateRangeSelector } from '@/components/reports/components/DateRangeSelector';
import { exportToCSV, exportToExcel, formatReportData } from '@/components/reports/utils/exportReport';
import { ReportGranularity, type TechPerformanceDto, type CustomReportResultDto } from '@/types';

function ReportsPage() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('summary');
  const [granularity, setGranularity] = useState<ReportGranularity>(ReportGranularity.Daily);

  // REVIEW: Using local state for date range - integrated with DateRangeSelector
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  );
  const [endDate, setEndDate] = useState(new Date().toISOString());

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

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
        cell: (info) => `${((info.getValue() as number) ?? 0).toFixed(1)}h`,
      },
      {
        accessorKey: 'averageFirstResponseTimeHours',
        header: 'First Response',
        cell: (info) => `${((info.getValue() as number) ?? 0).toFixed(1)}h`,
      },
      {
        accessorKey: 'p50ResolutionTimeHours',
        header: 'P50',
        cell: (info) => `${((info.getValue() as number) ?? 0).toFixed(1)}h`,
      },
      {
        accessorKey: 'p90ResolutionTimeHours',
        header: 'P90',
        cell: (info) => `${((info.getValue() as number) ?? 0).toFixed(1)}h`,
      },
    ],
    [],
  );

  const techTable = useReactTable({
    data: techPerformance?.technicians || [],
    columns: techColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Export handlers
  const handleExportSummary = (format: 'csv' | 'excel') => {
    if (!summaryData) return;

    const exportData = [
      { metric: 'Total Created', value: summaryData.totalCreated },
      { metric: 'Total Closed', value: summaryData.totalClosed },
      { metric: 'Total Open', value: summaryData.totalOpen },
      { metric: 'Avg Resolution Time (hours)', value: summaryData.averageResolutionTimeHours },
    ];

    const filename = `summary-report-${new Date().toISOString().split('T')[0]}`;
    if (format === 'csv') {
      exportToCSV(exportData, filename);
    } else {
      exportToExcel(exportData, filename);
    }
  };

  const handleExportCustom = (data: CustomReportResultDto, format: 'csv' | 'excel') => {
    const formattedData = formatReportData(data.rows);
    const filename = `custom-report-${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      exportToCSV(formattedData, filename);
    } else {
      exportToExcel(formattedData, filename);
    }
  };

  return (
    <>
      <Helmet>
        <title>Reports Dashboard</title>
      </Helmet>

      <div className="mb-5">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Reports Dashboard</h1>
          <div className="flex gap-3">
            <BaseButton
              variant="light"
              onClick={() => navigate('/reports/satisfaction')}
              icon={<Icon name="star" className="h-4 w-4" />}
            >
              CSAT Report
            </BaseButton>
            <DateRangeSelector
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateRangeChange}
            />
            <BaseButton
              variant="light"
              onClick={() => handleExportSummary('csv')}
              icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
            >
              Export CSV
            </BaseButton>
            <BaseButton
              variant="light"
              onClick={() => handleExportSummary('excel')}
              icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
            >
              Export Excel
            </BaseButton>
          </div>
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
                    {(summaryData?.averageResolutionTimeHours ?? 0).toFixed(1)}h
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
              <CustomReportBuilder onExport={handleExportCustom} />
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
