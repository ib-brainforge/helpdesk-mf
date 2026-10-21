import { CustomReportBuilder } from '@/components/reports/components/CustomReportBuilder';
import { KpiOverview } from '@/components/reports/kpi/KpiOverview';
import { TeamReport } from '@/components/reports/team/TeamReport';
import {
  exportToCSV,
  exportToExcel,
  formatReportData,
} from '@/components/reports/utils/exportReport';
import { useTimezone } from '@/security';
import type { CustomReportResultDto } from '@/types';
import { BaseTab, BaseTabs } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { DashboardPage } from '@brainforgeau/components/page';
import { useSearchParams } from '@modern-js/runtime/router';
import { useState } from 'react';

// URL query-param tab persistence: ?tab=<key> synced to selected tab.
const REPORT_VALID_TABS = new Set(['overview', 'team', 'custom']);
const REPORT_DEFAULT_TAB = 'overview';
/** Old links keep working: Team was called Tech Performance. */
const REPORT_TAB_ALIASES: Record<string, string> = {
  'tech-performance': 'team',
};

function ReportsPage() {
  const timezone = useTimezone();

  // Falls back to the first tab (REPORT_DEFAULT_TAB) when the param is absent or unknown.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab = (() => {
    const raw = searchParams.get('tab');
    const param = raw ? (REPORT_TAB_ALIASES[raw] ?? raw) : null;
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
        // Export PDF prints the Overview (print styles in KpiOverview); the
        // browser's print dialog offers Save as PDF. Nothing to install.
        selectedTab === 'overview' && (
          <BaseButton
            color="primary"
            onPress={() => window.print()}
            icon={<Icon name="download" className="h-4 w-4" />}
          >
            Export PDF
          </BaseButton>
        )
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
        <BaseTab key="overview" title="Overview">
          <div className="min-h-0 flex-1 overflow-auto">
            <KpiOverview />
          </div>
        </BaseTab>

        <BaseTab key="team" title="Team">
          <TeamReport />
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
