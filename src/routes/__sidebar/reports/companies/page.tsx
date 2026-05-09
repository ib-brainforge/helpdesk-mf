import { useState } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { BaseButton } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Card, CardContent, Spinner } from '@heroui/react';
import { DateRangeSelector } from '@/components/reports/components/DateRangeSelector';
import { useCompanyStatisticsReport } from '@/components/reports/hooks/useReports';
import { exportToXlsx } from '@/components/reports/utils/exportReport';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-default-500 mb-1">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function CompanyStatisticsPage() {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: stats, isLoading } = useCompanyStatisticsReport(startDate, endDate);

  const formatMinutes = (m: number | null | undefined) => {
    if (m == null) return 'N/A';
    if (m < 60) return `${Math.round(m)}m`;
    return `${(m / 60).toFixed(1)}h`;
  };

  const handleExport = () => {
    if (!stats) return;
    exportToXlsx(
      [
        {
          'Total Tickets': stats.totalTickets,
          'Open Tickets': stats.openTickets,
          'Closed Tickets': stats.closedTickets,
          'Avg Resolution Time': formatMinutes(stats.avgResolutionMinutes),
          'Avg First Response Time': formatMinutes(stats.avgFirstResponseMinutes),
        },
      ],
      'company-statistics',
    );
  };

  return (
    <>
      <Helmet>
        <title>Company Statistics - Helpdesk Reports</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Reports', href: '/reports-hub' },
            { label: 'Company Statistics', href: '/reports/companies', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Company Statistics</h1>
          <p className="text-default-500 mt-1">High-level overview of ticket volume and team performance</p>
        </div>
        <BaseButton
          variant="bordered"
          onPress={handleExport}
          isDisabled={!stats}
          icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
        >
          Export XLSX
        </BaseButton>
      </div>

      <div className="mb-6">
        <DateRangeSelector startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : stats ? (
        <>
          <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total Tickets" value={stats.totalTickets} />
            <StatCard label="Open" value={stats.openTickets} />
            <StatCard label="Closed" value={stats.closedTickets} />
            <StatCard label="Avg Resolution" value={formatMinutes(stats.avgResolutionMinutes)} />
            <StatCard label="Avg First Response" value={formatMinutes(stats.avgFirstResponseMinutes)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-4">
                <h2 className="text-sm font-semibold mb-4">Top Categories</h2>
                {stats.topCategories.length === 0 ? (
                  <p className="text-default-400 text-sm">No data</p>
                ) : (
                  <div className="space-y-3">
                    {stats.topCategories.map((c) => (
                      <div key={c.categoryId} className="flex items-center justify-between">
                        <span className="text-sm">{c.categoryName}</span>
                        <span className="font-semibold text-sm">{c.ticketCount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h2 className="text-sm font-semibold mb-4">Top Assignees</h2>
                {stats.topAssignees.length === 0 ? (
                  <p className="text-default-400 text-sm">No data</p>
                ) : (
                  <div className="space-y-3">
                    {stats.topAssignees.map((a) => (
                      <div key={a.assigneeId} className="flex items-center justify-between">
                        <span className="text-sm font-mono text-xs">{a.assigneeId.slice(0, 8)}…</span>
                        <div className="text-right">
                          <span className="font-semibold text-sm">{a.ticketCount}</span>
                          <span className="text-default-400 text-xs ml-2">({a.resolvedCount} resolved)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <p className="text-default-500">No data available.</p>
      )}
    </>
  );
}

export default CompanyStatisticsPage;
