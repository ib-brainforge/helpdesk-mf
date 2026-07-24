import { AppAuthSplash, AppLoadingSplash } from '@/components/AppSplash';
import { DateRangeSelector } from '@/components/reports/components/DateRangeSelector';
import { CSATRatingDistributionChart } from '@/components/satisfaction/CSATRatingDistributionChart';
import { StarRating } from '@/components/satisfaction/StarRating';
import { SummaryCard } from '@/components/shared';
import { useCSATReport } from '@/hooks/useSatisfaction';
import { CSATGroupBy } from '@/types';
import { BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import { Box } from '@brainforgeau/components/base';
import { DashboardPage, EmptyState } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useMemo, useState } from 'react';

// REVIEW: Following DashboardPage pattern — summary cards + chart grid
function CSATReportPage() {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  );
  const [endDate, setEndDate] = useState(new Date().toISOString());
  const [groupBy, setGroupBy] = useState<CSATGroupBy | undefined>(undefined);

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const { data: reportData, isLoading } = useCSATReport({
    dateFrom: startDate,
    dateTo: endDate,
    groupBy,
  });

  const satisfactionColor = useMemo(() => {
    if (!reportData) return 'text-default-600';
    const pct = reportData.satisfactionPercentage ?? 0;
    if (pct >= 80) return 'text-green-600';
    if (pct >= 60) return 'text-yellow-600';
    return 'text-danger';
  }, [reportData]);

  const mostCommonRating = useMemo(() => {
    if (!reportData?.ratingDistribution) return 'N/A';
    const dist = reportData.ratingDistribution;
    const rating1Count = dist.rating1Count ?? 0;
    const rating2Count = dist.rating2Count ?? 0;
    const rating3Count = dist.rating3Count ?? 0;
    const rating4Count = dist.rating4Count ?? 0;
    const rating5Count = dist.rating5Count ?? 0;
    const max = Math.max(
      rating1Count,
      rating2Count,
      rating3Count,
      rating4Count,
      rating5Count,
    );
    if (max === rating5Count) return '5 ⭐';
    if (max === rating4Count) return '4 ⭐';
    if (max === rating3Count) return '3 ⭐';
    if (max === rating2Count) return '2 ⭐';
    return '1 ⭐';
  }, [reportData]);

  if (isLoading) {
    return <AppLoadingSplash />;
  }

  return (
    <DashboardPage
      title="Customer Satisfaction (CSAT)"
      breadcrumbsKey="reports.satisfaction"
      actions={
        <DateRangeSelector
          startDate={startDate}
          endDate={endDate}
          onChange={handleDateRangeChange}
        />
      }
      summary={
        <>
          <SummaryCard
            title="Average Rating"
            value={`${reportData?.averageRating?.toFixed(1) || '0.0'} / 5.0`}
            icon="star"
            variant="warning"
          />
          <SummaryCard
            title="Total Ratings"
            value={reportData?.totalRatings || 0}
            icon="chat-bubble-left-right"
            variant="info"
          />
          <SummaryCard
            title="Satisfaction Rate"
            value={`${reportData?.satisfactionPercentage?.toFixed(1) || '0.0'}%`}
            subtitle="Ratings 4–5 stars"
            icon="face-smile"
            variant={
              (reportData?.satisfactionPercentage ?? 0) >= 80
                ? 'success'
                : (reportData?.satisfactionPercentage ?? 0) >= 60
                  ? 'warning'
                  : 'danger'
            }
          />
          <SummaryCard
            title="Most Common Rating"
            value={mostCommonRating}
            icon="chart-bar"
            variant="default"
          />
        </>
      }
      charts={
        <>
          <Box title="Rating Distribution">
            {reportData?.ratingDistribution ? (
              <CSATRatingDistributionChart
                distribution={{
                  rating1Count: reportData.ratingDistribution.rating1Count ?? 0,
                  rating2Count: reportData.ratingDistribution.rating2Count ?? 0,
                  rating3Count: reportData.ratingDistribution.rating3Count ?? 0,
                  rating4Count: reportData.ratingDistribution.rating4Count ?? 0,
                  rating5Count: reportData.ratingDistribution.rating5Count ?? 0,
                }}
              />
            ) : (
              <EmptyState title="No rating data" size="sm" />
            )}
          </Box>

          {/* Group-by filter */}
          <Box title="Group By">
            <BaseSelect
              label="Group by"
              placeholder="Select grouping"
              selectedKey={groupBy ?? null}
              onSelectionChange={key => {
                setGroupBy((key as CSATGroupBy) || undefined);
              }}
              className="max-w-xs"
            >
              <BaseSelectItem
                key={CSATGroupBy.Technician}
                value={CSATGroupBy.Technician}
              >
                Technician
              </BaseSelectItem>
              <BaseSelectItem
                key={CSATGroupBy.Category}
                value={CSATGroupBy.Category}
              >
                Category
              </BaseSelectItem>
              <BaseSelectItem
                key={CSATGroupBy.Priority}
                value={CSATGroupBy.Priority}
              >
                Priority
              </BaseSelectItem>
              <BaseSelectItem key={CSATGroupBy.Month} value={CSATGroupBy.Month}>
                Month
              </BaseSelectItem>
            </BaseSelect>
          </Box>
        </>
      }
    >
      {/* Grouped breakdown (conditional) */}
      {groupBy &&
        reportData?.groupedData &&
        reportData.groupedData.length > 0 && (
          <Box
            title={`Breakdown by ${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}`}
          >
            <div className="space-y-3">
              {reportData.groupedData.map(item => (
                <div
                  key={item.groupKey}
                  className="flex items-center justify-between p-3 bg-default-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.groupName}</p>
                    <p className="text-sm text-default-600">
                      {item.count} ratings
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-bold">
                      {(item.averageRating ?? 0).toFixed(1)}
                    </p>
                    <StarRating
                      value={Math.round(item.averageRating ?? 0)}
                      readonly
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Box>
        )}
    </DashboardPage>
  );
}

export default withAuthenticationRequired(CSATReportPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
