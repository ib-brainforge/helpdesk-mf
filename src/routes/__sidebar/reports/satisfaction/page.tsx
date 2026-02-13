import { useState, useMemo } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { Card, Select, SelectItem } from '@heroui/react';
import { PageSpinner } from '@brainforgeau/components/base';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { Icon } from '@brainforgeau/components';
import { DateRangeSelector } from '@/components/reports/components/DateRangeSelector';
import { StarRating } from '@/components/satisfaction/StarRating';
import { CSATRatingDistributionChart } from '@/components/satisfaction/CSATRatingDistributionChart';
import { useCSATReport } from '@/hooks/useSatisfaction';
import { CSATGroupBy } from '@/types';

// REVIEW: Following existing reports page pattern with date range filtering
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
    if (!reportData) return 'text-gray-600';
    if (reportData.satisfactionPercentage >= 80) return 'text-green-600';
    if (reportData.satisfactionPercentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }, [reportData]);

  if (isLoading) {
    return <PageSpinner title="Loading CSAT report..." />;
  }

  return (
    <>
      <Helmet>
        <title>Customer Satisfaction (CSAT) Report</title>
      </Helmet>

      <div className="mb-5">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Customer Satisfaction (CSAT)</h1>
          <DateRangeSelector
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateRangeChange}
          />
        </div>

        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Icon name="star" className="h-8 w-8 text-yellow-400 fill-current" />
                <div>
                  <p className="text-sm text-gray-600">Average Rating</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold">
                      {reportData?.averageRating?.toFixed(1) || '0.0'}
                    </p>
                    <StarRating value={Math.round(reportData?.averageRating || 0)} readonly size="sm" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Icon name="chat-bubble-left-right" className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Ratings</p>
                  <p className="text-3xl font-bold">{reportData?.totalRatings || 0}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Icon name="face-smile" className={`h-8 w-8 ${satisfactionColor}`} />
                <div>
                  <p className="text-sm text-gray-600">Satisfaction Rate</p>
                  <p className={`text-3xl font-bold ${satisfactionColor}`}>
                    {reportData?.satisfactionPercentage?.toFixed(1) || '0.0'}%
                  </p>
                  <p className="text-xs text-gray-500">Ratings 4-5 stars</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Icon name="chart-bar" className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Most Common Rating</p>
                  <p className="text-3xl font-bold">
                    {reportData?.ratingDistribution &&
                      (() => {
                        const dist = reportData.ratingDistribution;
                        const max = Math.max(
                          dist.rating1Count,
                          dist.rating2Count,
                          dist.rating3Count,
                          dist.rating4Count,
                          dist.rating5Count,
                        );
                        if (max === dist.rating5Count) return '5';
                        if (max === dist.rating4Count) return '4';
                        if (max === dist.rating3Count) return '3';
                        if (max === dist.rating2Count) return '2';
                        return '1';
                      })()}
                    ⭐
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Rating Distribution Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Rating Distribution</h3>
            {reportData?.ratingDistribution && (
              <CSATRatingDistributionChart distribution={reportData.ratingDistribution} />
            )}
          </Card>

          {/* Grouped Data */}
          {groupBy && reportData?.groupedData && reportData.groupedData.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Breakdown by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
              </h3>
              <div className="space-y-3">
                {reportData.groupedData.map((item) => (
                  <div
                    key={item.groupKey}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{item.groupName}</p>
                      <p className="text-sm text-gray-600">{item.count} ratings</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-bold">{item.averageRating.toFixed(1)}</p>
                      <StarRating value={Math.round(item.averageRating)} readonly size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Filters */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Group By</h3>
            <Select
              label="Group by"
              placeholder="Select grouping"
              selectedKeys={groupBy ? [groupBy] : []}
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0] as CSATGroupBy | undefined;
                setGroupBy(key);
              }}
              className="max-w-xs"
            >
              <SelectItem key={CSATGroupBy.Technician}>Technician</SelectItem>
              <SelectItem key={CSATGroupBy.Category}>Category</SelectItem>
              <SelectItem key={CSATGroupBy.Priority}>Priority</SelectItem>
              <SelectItem key={CSATGroupBy.Month}>Month</SelectItem>
            </Select>
          </Card>
        </div>
      </div>
    </>
  );
}

export default withAuthenticationRequired(CSATReportPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
