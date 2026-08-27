import { CustomReportBuilder } from '@/components/reports/components/CustomReportBuilder';
import { DateRangeSelector } from '@/components/reports/components/DateRangeSelector';
import {
  ResolutionTimeChart,
  TrendLineChart,
} from '@/components/reports/components/charts';
import {
  useDynamicsReport,
  useTechPerformanceReport,
} from '@/components/reports/hooks/useReports';
import {
  exportToCSV,
  exportToExcel,
  formatReportData,
} from '@/components/reports/utils/exportReport';
import {
  type CustomReportResultDto,
  ReportGranularity,
  type TechPerformanceDto,
} from '@/types';
import { BaseTab, BaseTabs } from '@brainforgeau/components';
import {
  BaseSelect,
  BaseSelectItem,
  BaseTable,
} from '@brainforgeau/components';
import { Box, Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { DashboardPage } from '@brainforgeau/components/page';
import { useTimezone } from '@brainforgeau/security';
import { useNavigate, useSearchParams } from '@modern-js/runtime/router';
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

// URL query-param tab persistence: ?tab=<key> synced to selected tab.
const REPORT_VALID_TABS = new Set(['dynamics', 'tech-performance', 'custom']);
const REPORT_DEFAULT_TAB = 'dynamics';

function ReportsPage() {
  const navigate = useNavigate();
  const timezone = useTimezone();

  // Falls back to the first tab (REPORT_DEFAULT_TAB) when the param is absent or unknown.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab = (() => {
    const param = searchParams.get('tab');
    return param && REPORT_VALID_TABS.has(param) ? param : REPORT_DEFAULT_TAB;
  })();
  const setSelectedTab = (key: string) => {
    setSearchParams(
      prev => {
        prev.set('tab', key);
        return prev;
      },
      { replace: true },
    );
  };
  const [granularity, setGranularity] = useState<ReportGranularity>(
    ReportGranularity.Daily,
  );

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
  const { data: techPerformance, isLoading: loadingTechPerf } =
    useTechPerformanceReport(startDate, endDate);

  const techColumns: ColumnDef<TechPerformanceDto, any>[] = useMemo(
    () => [
      {
        accessorKey: 'technicianId',
        header: 'Technician',
        cell: info => (info.getValue() as string)?.slice(0, 8) ?? '-',
      },
      {
        accessorKey: 'ticketsAssigned',
        header: 'Assigned',
        cell: info => info.getValue() as number,
      },
      {
        accessorKey: 'ticketsResolved',
        header: 'Resolved',
        cell: info => info.getValue() as number,
      },
      {
        accessorKey: 'avgResolutionMinutes',
        header: 'Avg Resolution',
        cell: info =>
          `${(((info.getValue() as number) ?? 0) / 60).toFixed(1)}h`,
      },
      {
        accessorKey: 'avgFirstResponseMinutes',
        header: 'First Response',
        cell: info =>
          `${(((info.getValue() as number) ?? 0) / 60).toFixed(1)}h`,
      },
      {
        accessorKey: 'p50ResolutionMinutes',
        header: 'P50',
        cell: info =>
          `${(((info.getValue() as number) ?? 0) / 60).toFixed(1)}h`,
      },
      {
        accessorKey: 'p90ResolutionMinutes',
        header: 'P90',
        cell: info =>
          `${(((info.getValue() as number) ?? 0) / 60).toFixed(1)}h`,
      },
    ],
    [],
  );

  const techTable = useReactTable({
    data: techPerformance || [],
    columns: techColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleExportCustom = (
    data: CustomReportResultDto,
    format: 'csv' | 'excel',
  ) => {
    const formattedData = formatReportData(data.rows, timezone);
    const filename = `custom-report-${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      exportToCSV(formattedData, filename);
    } else {
      exportToExcel(formattedData, filename);
    }
  };

  return (
    <DashboardPage
      title="Reports"
      breadcrumbsKey="reports.list"
      actions={
        <>
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
        </>
      }
    >
      {/*
        The tabs root and each panel have to be flex columns that FILL, or the
        table inside collapses.

        PageBody (`main`) already stretches to the viewport, but the tabs root
        sat at `flex: 0 1 auto` and stopped at its content height — 332px — and
        every wrapper below inherited that, so BaseTable's scroll region fell
        back to its 232px `min-h` floor and left ~500px of dead space beneath.
        (`fullHeight` on BaseTable does not help: in this version of the
        component the prop is destructured and never used.)

        min-h-0 on both, because a flex child defaults to min-height:auto and
        would otherwise refuse to shrink, pushing the overflow onto the page.
      */}
      <BaseTabs
        className="flex min-h-0 flex-1 flex-col"
        classNames={{ panel: 'flex min-h-0 flex-1 flex-col' }}
        selectedKey={selectedTab}
        onSelectionChange={key => setSelectedTab(key as string)}
      >
        {/* Dynamics Tab */}
        <BaseTab key="dynamics" title="Dynamics">
          {/*
            NOTE: these three utilities are correct but currently INERT on this
            tab. The chart stack (fixed 400px + 300px plus box chrome) is taller
            than the space PageBody stretches to, so `main` grows to fit it and
            this tab still scrolls the PAGE, exactly as it did before. `flex-1`
            has no definite parent height to divide and `overflow-auto` has no
            bound to scroll against.

            They are left in place because they are what makes the stack scroll
            inside the panel the moment something above caps the height — the
            way TicketGrid measures `innerHeight - top`. Unchanged behaviour
            here, not a fix.
          */}
          <div className="mt-4 min-h-0 flex-1 space-y-6 overflow-auto">
            <div className="flex gap-4">
              <BaseSelect
                label="Granularity"
                selectedKey={granularity}
                onSelectionChange={keys => {
                  const key = keys as ReportGranularity;
                  setGranularity(key);
                }}
                className="w-48"
              >
                <BaseSelectItem
                  key={ReportGranularity.Daily}
                  value={ReportGranularity.Daily}
                >
                  Daily
                </BaseSelectItem>
                <BaseSelectItem
                  key={ReportGranularity.Weekly}
                  value={ReportGranularity.Weekly}
                >
                  Weekly
                </BaseSelectItem>
                <BaseSelectItem
                  key={ReportGranularity.Monthly}
                  value={ReportGranularity.Monthly}
                >
                  Monthly
                </BaseSelectItem>
              </BaseSelect>
            </div>

            <Box title="Ticket Trends">
              {dynamicsData?.dataPoints && (
                <TrendLineChart data={dynamicsData.dataPoints} />
              )}
            </Box>

            <Box title="Average Resolution Time">
              {dynamicsData?.dataPoints && (
                <ResolutionTimeChart data={dynamicsData.dataPoints} />
              )}
            </Box>
          </div>
        </BaseTab>

        {/* Tech Performance Tab */}
        <BaseTab key="tech-performance" title="Tech Performance">
          <div className="mt-4 flex min-h-0 flex-1 flex-col">
            <BaseTable
              table={techTable}
              isLoading={loadingTechPerf}
              loading={{ title: 'Loading technician performance...' }}
              fullHeight
            />
          </div>
        </BaseTab>

        {/* Custom Tab */}
        <BaseTab key="custom" title="Custom">
          <div className="mt-4 min-h-0 flex-1 overflow-auto">
            <CustomReportBuilder onExport={handleExportCustom} />
          </div>
        </BaseTab>
      </BaseTabs>
    </DashboardPage>
  );
}

export default ReportsPage;
