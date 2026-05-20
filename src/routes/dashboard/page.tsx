import { useTicketSummaryReport } from '@/components/reports/hooks/useReports';
import { SummaryCard } from '@/components/shared';
import type {
  CategoryBreakdownDto,
  PriorityBreakdownDto,
  StatusBreakdownDto,
} from '@/types';
import { Box, DonutChart, PageSpinner } from '@brainforgeau/components';
import { DashboardPage, EmptyState } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';

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
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#f43f5e',
  '#0ea5e9',
  '#ec4899',
  '#6b7280',
  '#14b8a6',
  '#f97316',
];

function toStatusDonut(
  data: StatusBreakdownDto[],
): { label: string; value: number; color: string }[] {
  return data
    .filter(item => item.count > 0)
    .map(item => ({
      label: item.name,
      value: item.count,
      color:
        STATUS_COLORS[item.status] || STATUS_COLORS[item.name] || '#6b7280',
    }));
}

function toPriorityDonut(
  data: PriorityBreakdownDto[],
): { label: string; value: number; color: string }[] {
  return data
    .filter(item => item.count > 0)
    .map(item => ({
      label: item.name,
      value: item.count,
      color:
        PRIORITY_COLORS[item.priority] ||
        PRIORITY_COLORS[item.name] ||
        '#6b7280',
    }));
}

function toCategoryDonut(
  data: CategoryBreakdownDto[],
): { label: string; value: number; color: string }[] {
  return [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .filter(item => item.count > 0)
    .map((item, index) => ({
      label: item.name,
      value: item.count,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));
}

function HelpdeskDashboardPage() {
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
    <DashboardPage
      title="Helpdesk Dashboard"
      breadcrumbsKey="dashboard"
      summary={
        <>
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
            variant={(summaryData?.totalOpen ?? 0) > 0 ? 'warning' : 'default'}
          />
          <SummaryCard
            title="Avg Resolution"
            value={`${(summaryData?.averageResolutionTimeHours ?? 0).toFixed(1)}h`}
            subtitle="Average time to close"
            icon="clock"
            variant="default"
          />
        </>
      }
      charts={
        <>
          <Box title="Tickets by Status">
            {statusDonut.length > 0 ? (
              <DonutChart data={statusDonut} />
            ) : (
              <EmptyState title="No ticket data" size="sm" />
            )}
          </Box>

          <Box title="Tickets by Priority">
            {priorityDonut.length > 0 ? (
              <DonutChart data={priorityDonut} />
            ) : (
              <EmptyState title="No priority data" size="sm" />
            )}
          </Box>

          <Box title="Top Categories">
            {categoryDonut.length > 0 ? (
              <DonutChart data={categoryDonut} />
            ) : (
              <EmptyState title="No category data" size="sm" />
            )}
          </Box>
        </>
      }
    />
  );
}

export default withAuthenticationRequired(HelpdeskDashboardPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
