import { CustomReportBuilder } from '@/components/reports/components/CustomReportBuilder';
import { useTechPerformanceReport } from '@/components/reports/hooks/useReports';
import {
  REPORT_DEFAULT_RANGE,
  REPORT_RANGE_OPTIONS,
  type ReportRangeKey,
  resolveReportRange,
} from '@/components/reports/utils/dateRangePresets';
import {
  exportToCSV,
  exportToExcel,
  formatReportData,
} from '@/components/reports/utils/exportReport';
import { UserCell } from '@/components/shared';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import type { CustomReportResultDto, TechPerformanceDto } from '@/types';
import { BaseTab, BaseTabs } from '@brainforgeau/components';
import {
  BaseSelect,
  BaseSelectItem,
  BaseTable,
} from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
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
const REPORT_VALID_TABS = new Set(['tech-performance', 'custom']);
const REPORT_DEFAULT_TAB = 'tech-performance';

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

  // The header offers named ranges rather than two calendars: see
  // dateRangePresets.ts for why, and for the local-vs-UTC boundary handling.
  // Resolved on render so a preset keeps meaning what it says over time.
  const [rangeKey, setRangeKey] =
    useState<ReportRangeKey>(REPORT_DEFAULT_RANGE);
  const { startDate, endDate } = useMemo(
    () => resolveReportRange(rangeKey),
    [rangeKey],
  );

  const { data: techPerformance, isLoading: loadingTechPerf } =
    useTechPerformanceReport(startDate, endDate);

  /*
   * Technician names, from two sources in order of preference.
   *
   * 1. `technicianName` on the row, resolved server-side from the tenant's
   *    helpdesk contacts. Free, but null whenever the technician is not a
   *    contact — and HelpdeskContacts is empty in some environments, in which
   *    case this is null for everyone.
   * 2. identity-management, via the bulk lookup the ticket grid already uses.
   *
   * Both, rather than either: the server field costs nothing and covers the
   * common case without a round trip, while enrichment covers technicians who
   * were never contacts. Falling back to the id only when both miss.
   */
  const { userMap: technicianUsers } = useUserEnrichment(
    (techPerformance ?? []).map(row => row.technicianId),
  );

  const techColumns: ColumnDef<TechPerformanceDto, any>[] = useMemo(
    () => [
      {
        accessorKey: 'technicianId',
        header: 'Technician',
        cell: info => {
          const id = info.getValue() as string | undefined;
          const name = info.row.original.technicianName;
          if (!id) return <span className="text-muted-foreground">—</span>;
          const user = technicianUsers[id];
          if (user || name) {
            return <UserCell userInfo={user} fallbackName={name} />;
          }
          // Neither source has a name yet. Show the id rather than a stand-in:
          // it is still traceable in the database and in the logs, which
          // "Unknown user" is not.
          return (
            <span
              className="font-mono text-muted-foreground text-xs"
              title={id}
            >
              {id.slice(0, 8)}
            </span>
          );
        },
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
    // technicianUsers: the Technician cell closes over it, so the columns have
    // to be rebuilt when enrichment lands or every row stays on its id.
    [technicianUsers],
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
          <BaseSelect
            aria-label="Date range"
            selectedKey={rangeKey}
            onSelectionChange={keys => setRangeKey(keys as ReportRangeKey)}
            className="w-48"
          >
            {REPORT_RANGE_OPTIONS.map(option => (
              <BaseSelectItem key={option.key} value={option.key}>
                {option.label}
              </BaseSelectItem>
            ))}
          </BaseSelect>
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
