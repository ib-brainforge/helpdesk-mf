import { withAuthenticationRequired } from '@brainforgeau/security';
import { Helmet } from '@modern-js/runtime/head';
import {
  Box,
  DonutChart,
  PageSpinner,
} from '@brainforgeau/components';
import { SummaryCard } from '@/components/shared';
import { TEST_IDS } from '@/constants/testIds';
import { useTicketSummaryReport } from '@/components/reports/hooks/useReports';
import type { StatusBreakdownDto, PriorityBreakdownDto, CategoryBreakdownDto } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  New: '#3b82f6',
  InProgress: '#f59e0b',
  Closed: '#10b981',
  Open: '#6366f1',
  OnHold: '#8b5cf6',
  Resolved: '#0ea5e9',
};

const PRIORITY_COLORS: Record<string, string> = {
  None: '#9ca3af',
  Low: '#3b82f6',
  Normal: '#10b981',
  High: '#f59e0b',
  Critical: '#ef4444',
};

const CATEGORY_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e',
  '#0ea5e9', '#ec4899', '#6b7280', '#14b8a6', '#f97316',
];

function toStatusDonut(data: StatusBreakdownDto[]): { label: string; value: number; color: string }[] {
  return data
    .filter(item => item.count > 0)
    .map(item => ({
      label: item.statusName,
      value: item.count,
      color: STATUS_COLORS[item.statusName] || '#6b7280',
    }));
}

function toPriorityDonut(data: PriorityBreakdownDto[]): { label: string; value: number; color: string }[] {
  return data
    .filter(item => item.count > 0)
    .map(item => ({
      label: item.priorityName,
      value: item.count,
      color: PRIORITY_COLORS[item.priorityName] || '#6b7280',
    }));
}

function toCategoryDonut(data: CategoryBreakdownDto[]): { label: string; value: number; color: string }[] {
  return [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .filter(item => item.count > 0)
    .map((item, index) => ({
      label: item.categoryName,
      value: item.count,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));
}

function DashboardPage() {
  const { data: summaryData, isLoading } = useTicketSummaryReport();

  if (isLoading) {
    return <PageSpinner title="Loading dashboard..." />;
  }

  const statusDonut = Array.isArray(summaryData?.byStatus)
    ? toStatusDonut(summaryData.byStatus)
    : [];
  const priorityDonut = Array.isArray(summaryData?.byPriority)
    ? toPriorityDonut(summaryData.byPriority)
    : [];
  const categoryDonut = Array.isArray(summaryData?.byCategory)
    ? toCategoryDonut(summaryData.byCategory)
    : [];

  return (
    <>
      <Helmet>
        <title>Dashboard</title>
      </Helmet>
      <div className="mb-5" data-testid={TEST_IDS.dashboard.page}>
        <div className="mb-5 items-center justify-between lg:flex">
          <h1 className="text-2xl font-semibold dark:text-white mb-2.5 lg:mb-0">
            Helpdesk Dashboard
          </h1>
        </div>
      </div>

      <div className="mb-7.5 flex flex-col gap-6">
        {/* Key Metrics */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total Created"
            value={summaryData?.totalCreated ?? 0}
            icon="ticket"
            variant="info"
          />
          <SummaryCard
            title="Total Closed"
            value={summaryData?.totalClosed ?? 0}
            subtitle="Resolved tickets"
            icon="check-circle"
            variant="success"
          />
          <SummaryCard
            title="Total Open"
            value={summaryData?.totalOpen ?? 0}
            subtitle="Awaiting resolution"
            icon="exclamation-triangle"
            variant={
              (summaryData?.totalOpen ?? 0) > 0 ? 'warning' : 'default'
            }
          />
          <SummaryCard
            title="Avg Resolution"
            value={`${(summaryData?.averageResolutionTimeHours ?? 0).toFixed(1)}h`}
            subtitle="Average time to close"
            icon="clock"
            variant="default"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Box title="Tickets by Status">
            {statusDonut.length > 0 ? (
              <DonutChart data={statusDonut} />
            ) : (
              <EmptyChartState message="No ticket data" />
            )}
          </Box>

          <Box title="Tickets by Priority">
            {priorityDonut.length > 0 ? (
              <DonutChart data={priorityDonut} />
            ) : (
              <EmptyChartState message="No priority data" />
            )}
          </Box>

          <Box title="Top Categories">
            {categoryDonut.length > 0 ? (
              <DonutChart data={categoryDonut} />
            ) : (
              <EmptyChartState message="No category data" />
            )}
          </Box>
        </div>
      </div>
    </>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <span className="text-default-400 text-sm">{message}</span>
    </div>
  );
}

export default withAuthenticationRequired(DashboardPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
