import { useState, useMemo } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { BaseButton, Icon, BaseSelect, BaseSelectItem, BaseTable } from '@brainforgeau/components';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Card, CardBody, Spinner } from '@heroui/react';
import { DateRangeSelector } from '@/components/reports/components/DateRangeSelector';
import { addToast } from '@heroui/react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useTicketSummaryReport } from '@/components/reports/hooks/useReports';
import { useTicketsData } from '@/components/tickets/hooks/useTickets';
import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';

function PieChart({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = ['#0070f3', '#7928ca', '#ff0080', '#00dfd8'];

  return (
    <Card>
      <CardBody className="p-4">
        <h3 className="text-sm font-semibold mb-4">{title}</h3>
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            {/* REVIEW: Simple CSS pie chart - replace with proper chart library if needed */}
            <div className="w-full h-full rounded-full" style={{
              background: `conic-gradient(${data.map((item, i) => {
                const prevPercentage = data.slice(0, i).reduce((sum, d) => sum + d.value, 0) / total * 100;
                const percentage = item.value / total * 100;
                return `${colors[i % colors.length]} ${prevPercentage}% ${prevPercentage + percentage}%`;
              }).join(', ')})`,
            }} />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {data.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: colors[i % colors.length] }}
                />
                <span className="text-default-600">{item.name}</span>
              </div>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <Card>
      <CardBody className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-default-500 mb-1">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <Icon name={icon} className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function ReportsSummaryPage() {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sorting, setSorting] = useState<SortingState>([]);

  // Fetch report summary data
  const { data: summaryData, isLoading: isLoadingSummary } = useTicketSummaryReport(startDate, endDate);

  // Fetch categories for filter dropdown
  const { categories } = useCategoriesData();

  // Fetch tickets for table with category filter
  const {
    items: tickets,
    isLoading: isLoadingTickets,
  } = useTicketsData();

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleMoreFilters = () => {
    addToast({
      title: 'Coming soon',
      description: 'Advanced filters will be available soon',
      severity: 'warning',
    });
  };

  // Transform API data for pie charts
  // API returns dictionaries like { "CategoryName": count } not arrays
  const categoryChartData = useMemo(() => {
    if (!summaryData?.byCategory) return [];
    const dict = summaryData.byCategory as unknown as Record<string, number>;
    return Object.entries(dict).map(([name, value]) => ({ name, value }));
  }, [summaryData]);

  const statusChartData = useMemo(() => {
    if (!summaryData?.byStatus) return [];
    const dict = summaryData.byStatus as unknown as Record<string, number>;
    return Object.entries(dict).map(([name, value]) => ({ name, value }));
  }, [summaryData]);

  const priorityChartData = useMemo(() => {
    if (!summaryData?.byPriority) return [];
    const dict = summaryData.byPriority as unknown as Record<string, number>;
    return Object.entries(dict).map(([name, value]) => ({ name, value }));
  }, [summaryData]);

  // Filter tickets by category if selected
  const filteredTickets = useMemo(() => {
    if (selectedCategory === 'all') return tickets;
    return tickets.filter((ticket) => ticket.categoryId === selectedCategory);
  }, [tickets, selectedCategory]);

  const columns: ColumnDef<typeof tickets[0], any>[] = useMemo(
    () => [
      {
        accessorKey: 'ticketNumber',
        header: 'Ticket ID',
        cell: (info) => (
          <span className="text-primary font-medium">#{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'subject',
        header: 'Subject',
        cell: (info) => info.getValue() as string,
      },
      {
        accessorKey: 'categoryName',
        header: 'Category',
        cell: (info) => info.getValue() as string,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => {
          const status = info.getValue() as string;
          const colors: Record<string, string> = {
            New: 'bg-primary-100 text-primary-800',
            InProgress: 'bg-warning-100 text-warning-800',
            Closed: 'bg-success-100 text-success-800',
          };
          return (
            <span className={`px-2 py-0.5 rounded-full text-xs ${colors[status] || 'bg-default-100'}`}>
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: (info) => {
          const priority = info.getValue() as string;
          const colors: Record<string, string> = {
            Critical: 'bg-danger-100 text-danger-800',
            High: 'bg-warning-100 text-warning-800',
            Normal: 'bg-default-100 text-default-800',
            Low: 'bg-default-50 text-default-600',
            None: 'bg-default-50 text-default-600',
          };
          return (
            <span className={`px-2 py-0.5 rounded-full text-xs ${colors[priority] || 'bg-default-100'}`}>
              {priority}
            </span>
          );
        },
      },
      {
        accessorKey: 'requesterName',
        header: 'Requester',
        cell: (info) => info.getValue() as string,
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: (info) => {
          const date = info.getValue() as string;
          return date ? new Date(date).toLocaleDateString() : '';
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredTickets,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <Helmet>
        <title>Reports Summary - Helpdesk</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Reports', href: '/reports-hub' },
            { label: 'Summary', href: '/reports/summary', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports Summary</h1>
          <p className="text-default-500 mt-1">Overview of ticket metrics with charts and trends</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-3">
        <BaseSelect
          label="Category"
          placeholder="All categories"
          selectedKeys={new Set([selectedCategory])}
          onSelectionChange={(keys) => {
            const key = Array.from(keys)[0] as string;
            setSelectedCategory(key);
          }}
          className="w-48"
        >
          {[
            <BaseSelectItem key="all">All categories</BaseSelectItem>,
            ...categories.map((cat) => (
              <BaseSelectItem key={cat.id}>{cat.name}</BaseSelectItem>
            )),
          ]}
        </BaseSelect>
        <DateRangeSelector
          startDate={startDate}
          endDate={endDate}
          onChange={handleDateRangeChange}
        />
        <BaseButton
          variant="bordered"
          onPress={handleMoreFilters}
          icon={<Icon name="adjustments-horizontal" className="h-4 w-4" />}
        >
          More filters
        </BaseButton>
      </div>

      {isLoadingSummary ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <PieChart data={categoryChartData} title="By Category" />
            <PieChart data={statusChartData} title="By Status" />
            <PieChart data={priorityChartData} title="By Priority" />
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard
              label="Tickets Created"
              value={summaryData?.totalCreated ?? 0}
              icon="plus"
            />
            <StatCard
              label="Tickets Closed"
              value={summaryData?.totalClosed ?? 0}
              icon="check"
            />
            <StatCard
              label="Tickets Open"
              value={(summaryData?.totalCreated ?? 0) - (summaryData?.totalClosed ?? 0)}
              icon="clock"
            />
            <StatCard
              label="Avg Response Time"
              value={
                (summaryData as any)?.avgFirstResponseMinutes != null
                  ? `${((summaryData as any).avgFirstResponseMinutes / 60).toFixed(1)}h`
                  : 'N/A'
              }
              icon="flash"
            />
            <StatCard
              label="Avg Resolution Time"
              value={
                (summaryData as any)?.avgResolutionMinutes != null
                  ? `${((summaryData as any).avgResolutionMinutes / 60).toFixed(1)}h`
                  : 'N/A'
              }
              icon="speedometer"
            />
          </div>
        </>
      )}

      {/* Ticket Table */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Ticket Details</h2>
        <BaseTable
          table={table}
          isLoading={isLoadingTickets}
          fullHeight={false}
        />
      </div>
    </>
  );
}

export default ReportsSummaryPage;
