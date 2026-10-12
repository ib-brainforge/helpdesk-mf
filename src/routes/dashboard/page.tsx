import { AppAuthSplash, AppLoadingSplash } from '@/components/AppSplash';
import { useTicketSummaryReport } from '@/components/reports/hooks/useReports';
import { SummaryCard } from '@/components/shared';
import { withAuthenticationRequired } from '@/security';
import type {
  CategoryBreakdownDto,
  PriorityBreakdownDto,
  StatusBreakdownDto,
} from '@/types';
import { BaseButton, Box, DonutChart, Icon } from '@brainforgeau/components';
import { DashboardPage, EmptyState } from '@brainforgeau/components/page';
import { useMemo, useState } from 'react';

// Chart colors aligned with BrainForge theme palette (--color-* tokens)
const STATUS_COLORS: Record<string, string> = {
  New: '#1868db',
  InProgress: '#e2b203',
  Closed: '#6a9a23',
  Open: '#bf63f3',
  OnHold: '#ff7f00',
  Resolved: '#6acda4',
};

const PRIORITY_COLORS: Record<string, string> = {
  None: '#8c8f97',
  Low: '#1868db',
  Normal: '#6a9a23',
  High: '#ff7f00',
  Critical: '#f15050',
};

const CATEGORY_COLORS = [
  '#1868db',
  '#6a9a23',
  '#e2b203',
  '#bf63f3',
  '#f15050',
  '#6acda4',
  '#ff7f00',
  '#59636e',
  '#943073',
  '#4688ec',
];

const RANGE_OPTIONS = [
  { key: '7', label: 'Last 7 days', days: 7 },
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: '90', label: 'Last 90 days', days: 90 },
  { key: '365', label: 'Last 12 months', days: 365 },
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
        STATUS_COLORS[item.status] || STATUS_COLORS[item.name] || '#8c8f97',
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
        '#8c8f97',
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
  const [selectedRange, setSelectedRange] = useState('30');

  const { startDate, endDate } = useMemo(() => {
    const option = RANGE_OPTIONS.find(o => o.key === selectedRange);
    const days = option?.days ?? 30;
    const end = new Date().toISOString();
    const start = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    ).toISOString();
    return { startDate: start, endDate: end };
  }, [selectedRange]);

  const {
    data: summaryData,
    isLoading,
    error,
  } = useTicketSummaryReport(startDate, endDate);

  if (isLoading) {
    return <AppLoadingSplash />;
  }

  if (error) {
    const status = (error as any)?.response?.status;
    const isForbidden = status === 403 || status === 419;
    return (
      <DashboardPage title="Helpdesk Dashboard" breadcrumbsKey="dashboard">
        <EmptyState
          title={isForbidden ? 'Access denied' : 'Failed to load dashboard'}
          description={
            isForbidden
              ? 'You do not have permission to view reports. Contact your administrator to request the Reports permission.'
              : 'An error occurred while loading the dashboard data. Please try again later.'
          }
          live
        />
      </DashboardPage>
    );
  }

  const rangeLabel =
    RANGE_OPTIONS.find(o => o.key === selectedRange)?.label ?? 'Last 30 days';

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
      actions={
        <div className="flex items-center gap-2">
          {RANGE_OPTIONS.map(option => (
            <BaseButton
              key={option.key}
              size="sm"
              color="primary"
              variant={selectedRange !== option.key ? 'bordered' : undefined}
              onPress={() => setSelectedRange(option.key)}
            >
              {option.label}
            </BaseButton>
          ))}
        </div>
      }
      summary={
        <>
          <SummaryCard
            title="Created"
            value={summaryData?.totalCreated ?? 0}
            subtitle={rangeLabel}
            icon="ticket"
            variant="info"
          />
          <SummaryCard
            title="Closed"
            value={summaryData?.totalClosed ?? 0}
            subtitle={rangeLabel}
            icon="check-circle"
            variant="success"
          />
          <SummaryCard
            title="Open"
            value={summaryData?.totalOpen ?? 0}
            subtitle={rangeLabel}
            icon="exclamation-triangle"
            variant={(summaryData?.totalOpen ?? 0) > 0 ? 'warning' : 'default'}
          />
          <SummaryCard
            title="Avg Resolution"
            value={`${(summaryData?.averageResolutionTimeHours ?? 0).toFixed(1)}h`}
            subtitle={rangeLabel}
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
  OnRedirecting: () => <AppAuthSplash />,
});
