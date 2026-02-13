import { useState, useMemo } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { useNavigate } from '@modern-js/runtime/router';
import { Tabs, Tab } from '@heroui/react';
import { Box, Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { BaseTable, BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  useDynamicsReport,
  useTechPerformanceReport,
} from '@/components/reports/hooks/useReports';
import {
  TrendLineChart,
  ResolutionTimeChart,
} from '@/components/reports/components/charts';
import { CustomReportBuilder } from '@/components/reports/components/CustomReportBuilder';
import { DateRangeSelector } from '@/components/reports/components/DateRangeSelector';
import { exportToCSV, exportToExcel, formatReportData } from '@/components/reports/utils/exportReport';
import { ReportGranularity, type TechPerformanceDto, type CustomReportResultDto } from '@/types';

function ReportsPage() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('dynamics');
  const [granularity, setGranularity] = useState<ReportGranularity>(ReportGranularity.Daily);

  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  );
  const [endDate, setEndDate] = useState(new Date().toISOString());

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

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
        accessorKey: 'technicianId',
        header: 'Technician',
        cell: (info) => (info.getValue() as string)?.slice(0, 8) ?? '-',
      },
      {
        accessorKey: 'ticketsAssigned',
        header: 'Assigned',
        cell: (info) => info.getValue() as number,
      },
      {
        accessorKey: 'ticketsResolved',
        header: 'Resolved',
        cell: (info) => info.getValue() as number,
      },
      {
        accessorKey: 'avgResolutionMinutes',
        header: 'Avg Resolution',
        cell: (info) => `${(((info.getValue() as number) ?? 0) / 60).toFixed(1)}h`,
      },
      {
        accessorKey: 'avgFirstResponseMinutes',
        header: 'First Response',
        cell: (info) => `${(((info.getValue() as number) ?? 0) / 60).toFixed(1)}h`,
      },
      {
        accessorKey: 'p50ResolutionMinutes',
        header: 'P50',
        cell: (info) => `${(((info.getValue() as number) ?? 0) / 60).toFixed(1)}h`,
      },
      {
        accessorKey: 'p90ResolutionMinutes',
        header: 'P90',
        cell: (info) => `${(((info.getValue() as number) ?? 0) / 60).toFixed(1)}h`,
      },
    ],
    [],
  );

  const techTable = useReactTable({
    data: techPerformance || [],
    columns: techColumns,
    getCoreRowModel: getCoreRowModel(),
  });

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
        <title>Reports</title>
      </Helmet>

      <div className="mb-5">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Reports</h1>
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
          </div>
        </div>

        <Tabs
          selectedKey={selectedTab}
          onSelectionChange={(key) => setSelectedTab(key as string)}
          aria-label="Report tabs"
          classNames={{
            tabList:
              'gap-0.5 w-full relative rounded-none p-0 shadow-[inset_0_-1px_0_0_var(--color-white),inset_0_-3px_0_0_var(--color-light)]',
            cursor: 'w-full bg-blue',
            tab: 'max-w-fit h-11.5 px-1 md:px-5 font-medium text-sm relative z-10 span:text-blue !opacity-100 *:min-h-1 hover:*:!text-blue',
            tabContent: 'group-data-[selected=true]:text-blue',
            panel: 'p-0 pt-7.5',
          }}
          color="primary"
          variant="underlined"
        >
          {/* Dynamics Tab */}
          <Tab key="dynamics" title="Dynamics">
            <div className="mt-4 space-y-6">
              <div className="flex gap-4">
                <BaseSelect
                  label="Granularity"
                  selectedKeys={new Set([granularity])}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0] as ReportGranularity;
                    setGranularity(key);
                  }}
                  className="w-48"
                >
                  <BaseSelectItem key={ReportGranularity.Daily}>
                    Daily
                  </BaseSelectItem>
                  <BaseSelectItem key={ReportGranularity.Weekly}>
                    Weekly
                  </BaseSelectItem>
                  <BaseSelectItem key={ReportGranularity.Monthly}>
                    Monthly
                  </BaseSelectItem>
                </BaseSelect>
              </div>

              <Box title="Ticket Trends">
                {dynamicsData?.dataPoints && <TrendLineChart data={dynamicsData.dataPoints} />}
              </Box>

              <Box title="Average Resolution Time">
                {dynamicsData?.dataPoints && (
                  <ResolutionTimeChart data={dynamicsData.dataPoints} />
                )}
              </Box>
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

          {/* Custom Tab */}
          <Tab key="custom" title="Custom">
            <div className="mt-4">
              <CustomReportBuilder onExport={handleExportCustom} />
            </div>
          </Tab>
        </Tabs>
      </div>
    </>
  );
}

export default ReportsPage;
