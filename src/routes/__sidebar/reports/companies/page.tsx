import { AppLoadingSplash } from '@/components/AppSplash';
import { useCompanyStatisticsReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';
import { SummaryCard } from '@/components/shared';
import { BaseButton } from '@brainforgeau/components';
import { Box, Icon } from '@brainforgeau/components/base';
import { BaseDateRangePicker } from '@brainforgeau/components/date-picker';
import { DashboardPage, EmptyState } from '@brainforgeau/components/page';
import { useState } from 'react';

const formatMinutes = (m: number | null | undefined) => {
  if (m == null) return 'N/A';
  if (m < 60) return `${Math.round(m)}m`;
  return `${(m / 60).toFixed(1)}h`;
};

function CompanyStatisticsPage() {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0],
  );

  const { data: stats, isLoading } = useCompanyStatisticsReport(
    startDate,
    endDate,
  );

  const handleExport = () => {
    if (!stats) return;
    exportToXlsx(
      [
        {
          'Total Tickets': stats.totalTickets,
          'Open Tickets': stats.openTickets,
          'Closed Tickets': stats.closedTickets,
          'Avg Resolution Time': formatMinutes(stats.avgResolutionMinutes),
          'Avg First Response Time': formatMinutes(
            stats.avgFirstResponseMinutes,
          ),
        },
      ],
      'company-statistics',
    );
  };

  if (isLoading) return <AppLoadingSplash />;

  if (!stats) {
    return (
      <DashboardPage
        title="Company Statistics"
        breadcrumbsKey="reports.companies"
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
        <EmptyState title="No data available" live />
      </DashboardPage>
    );
  }

  return (
    <DashboardPage
      title="Company Statistics"
      breadcrumbsKey="reports.companies"
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
            isDisabled={!stats}
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
            value={stats.totalTickets}
            icon="ticket"
            variant="default"
          />
          <SummaryCard
            title="Open"
            value={stats.openTickets}
            icon="exclamation-triangle"
            variant={stats.openTickets > 0 ? 'warning' : 'default'}
          />
          <SummaryCard
            title="Closed"
            value={stats.closedTickets}
            icon="check-circle"
            variant="success"
          />
          <SummaryCard
            title="Avg Resolution"
            value={formatMinutes(stats.avgResolutionMinutes)}
            icon="clock"
            variant="info"
          />
        </>
      }
      charts={
        <>
          <Box title="Top Categories">
            {stats.topCategories.length === 0 ? (
              <EmptyState title="No category data" size="sm" />
            ) : (
              <div className="space-y-3">
                {stats.topCategories.map(c => (
                  <div
                    key={c.categoryId}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{c.categoryName}</span>
                    <span className="font-semibold text-sm">
                      {c.ticketCount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Box>

          <Box title="Top Assignees">
            {stats.topAssignees.length === 0 ? (
              <EmptyState title="No assignee data" size="sm" />
            ) : (
              <div className="space-y-3">
                {stats.topAssignees.map(a => (
                  <div
                    key={a.assigneeId}
                    className="flex items-center justify-between"
                  >
                    <span className="font-mono text-xs">
                      {a.assigneeId.slice(0, 8)}…
                    </span>
                    <div className="text-right">
                      <span className="font-semibold text-sm">
                        {a.ticketCount}
                      </span>
                      <span className="text-default-400 text-xs ml-2">
                        ({a.resolvedCount} resolved)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Box>

          <SummaryCard
            title="Avg First Response"
            value={formatMinutes(stats.avgFirstResponseMinutes)}
            icon="flash"
            variant="info"
          />
        </>
      }
    />
  );
}

export default CompanyStatisticsPage;
