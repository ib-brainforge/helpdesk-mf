import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';
import {
  type AdvancedFilterValues,
  AdvancedFiltersModal,
} from '@/components/reports/components/AdvancedFiltersModal';
import { useTicketSummaryReport } from '@/components/reports/hooks/useReports';
import { SummaryCard } from '@/components/shared';
import { useTicketsData } from '@/components/tickets/hooks/useTickets';
import {
  BaseButton,
  BaseCard,
  BaseSelect,
  BaseSelectItem,
  BaseTable,
} from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components';
import { BaseDateRangePicker } from '@brainforgeau/components/date-picker';
import { DashboardPage } from '@brainforgeau/components/page';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import { Card, CardContent } from '@heroui/react';
import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

function PieChart({
  data,
  title,
}: {
  data: { name: string; value: number }[];
  title: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = [
    '#1868db',
    '#bf63f3',
    '#f15050',
    '#6acda4',
    '#e2b203',
    '#ff7f00',
  ];

  return (
    <BaseCard>
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      <div className="flex items-center justify-center">
        <div className="relative h-32 w-32">
          {/* REVIEW: Simple CSS pie chart - replace with proper chart library if needed */}
          <div
            className="h-full w-full rounded-full"
            style={{
              background: `conic-gradient(${data
                .map((item, i) => {
                  const prevPercentage =
                    (data.slice(0, i).reduce((sum, d) => sum + d.value, 0) /
                      total) *
                    100;
                  const percentage = (item.value / total) * 100;
                  return `${colors[i % colors.length]} ${prevPercentage}% ${prevPercentage + percentage}%`;
                })
                .join(', ')})`,
            }}
          />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {data.map((item, i) => (
          <div
            key={item.name}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <span className="text-default-600">{item.name}</span>
            </div>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </BaseCard>
  );
}

function ReportsSummaryPage() {
  const timezone = useTimezone();
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterValues>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    statuses: [],
    priorities: [],
    categoryIds: [],
    assigneeIds: [],
  });

  const { data: summaryData, isLoading: isLoadingSummary } =
    useTicketSummaryReport(startDate, endDate);
  const { categories } = useCategoriesData();
  const { items: tickets, isLoading: isLoadingTickets } = useTicketsData();

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleApplyAdvancedFilters = (values: AdvancedFilterValues) => {
    setAdvancedFilters(values);
    if (values.startDate) setStartDate(values.startDate);
    if (values.endDate) setEndDate(values.endDate);
  };

  const activeAdvancedFilterCount = [
    advancedFilters.statuses.length > 0,
    advancedFilters.priorities.length > 0,
    advancedFilters.categoryIds.length > 0,
  ].filter(Boolean).length;

  const categoryChartData = useMemo(() => {
    return (summaryData?.byCategory ?? []).map(item => ({
      name: item.name,
      value: item.count,
    }));
  }, [summaryData]);

  const statusChartData = useMemo(() => {
    return (summaryData?.byStatus ?? []).map(item => ({
      name: item.name,
      value: item.count,
    }));
  }, [summaryData]);

  const priorityChartData = useMemo(() => {
    return (summaryData?.byPriority ?? []).map(item => ({
      name: item.name,
      value: item.count,
    }));
  }, [summaryData]);

  const filteredTickets = useMemo(() => {
    let result = tickets;

    if (selectedCategory !== 'all') {
      result = result.filter(ticket => ticket.categoryId === selectedCategory);
    }

    if (advancedFilters.statuses.length > 0) {
      result = result.filter(
        ticket =>
          ticket.status != null &&
          advancedFilters.statuses.includes(ticket.status),
      );
    }
    if (advancedFilters.priorities.length > 0) {
      result = result.filter(
        ticket =>
          ticket.priority != null &&
          advancedFilters.priorities.includes(ticket.priority),
      );
    }
    if (advancedFilters.categoryIds.length > 0) {
      result = result.filter(
        ticket =>
          ticket.categoryId != null &&
          advancedFilters.categoryIds.includes(ticket.categoryId),
      );
    }

    return result;
  }, [tickets, selectedCategory, advancedFilters]);

  const columns: ColumnDef<(typeof tickets)[0], any>[] = useMemo(
    () => [
      {
        accessorKey: 'ticketNumber',
        header: 'Ticket ID',
        cell: info => (
          <span className="text-primary font-medium">
            #{info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'subject',
        header: 'Subject',
        cell: info => info.getValue() as string,
      },
      {
        accessorKey: 'categoryName',
        header: 'Category',
        cell: info => info.getValue() as string,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: info => {
          const status = info.getValue() as string;
          const colors: Record<string, string> = {
            New: 'bg-primary-100 text-primary-800',
            InProgress: 'bg-warning-100 text-warning-800',
            Closed: 'bg-success-100 text-success-800',
          };
          return (
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${colors[status] || 'bg-default-100'}`}
            >
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: info => {
          const priority = info.getValue() as string;
          const colors: Record<string, string> = {
            Critical: 'bg-danger-100 text-danger-800',
            High: 'bg-warning-100 text-warning-800',
            Normal: 'bg-default-100 text-default-800',
            Low: 'bg-default-50 text-default-600',
            None: 'bg-default-50 text-default-600',
          };
          return (
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${colors[priority] || 'bg-default-100'}`}
            >
              {priority}
            </span>
          );
        },
      },
      {
        accessorKey: 'requesterName',
        header: 'Requester',
        cell: info => info.getValue() as string,
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: info => {
          const date = info.getValue() as string;
          return formatDateTime(date, { timezone });
        },
      },
    ],
    [timezone],
  );

  const table = useReactTable({
    data: filteredTickets,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <DashboardPage
      title="Reports Summary"
      breadcrumbsKey="reports.summary"
      actions={
        <>
          <BaseSelect
            label="Category"
            placeholder="All categories"
            selectedKey={selectedCategory}
            onSelectionChange={keys => {
              setSelectedCategory(keys as string);
            }}
            className="w-48"
          >
            {[
              <BaseSelectItem key="all" value="all">
                All categories
              </BaseSelectItem>,
              ...categories.map(cat => (
                <BaseSelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </BaseSelectItem>
              )),
            ]}
          </BaseSelect>
          <BaseDateRangePicker
            value={{ start: new Date(startDate), end: new Date(endDate) }}
            onChange={({ start, end }) =>
              handleDateRangeChange(
                start.toISOString().split('T')[0],
                end.toISOString().split('T')[0],
              )
            }
          />
          <BaseButton
            variant="bordered"
            onPress={() => setIsAdvancedFiltersOpen(true)}
            icon={<Icon name="adjustments-horizontal" className="h-4 w-4" />}
          >
            More filters
            {activeAdvancedFilterCount > 0 && (
              <span className="bg-primary ml-1.5 rounded-full px-1.5 py-0.5 text-xs text-white">
                {activeAdvancedFilterCount}
              </span>
            )}
          </BaseButton>
        </>
      }
      summary={
        <>
          <SummaryCard
            title="Tickets Created"
            value={summaryData?.totalCreated ?? 0}
            icon="plus"
            variant="info"
            isLoading={isLoadingSummary}
          />
          <SummaryCard
            title="Tickets Closed"
            value={summaryData?.totalClosed ?? 0}
            icon="check"
            variant="success"
            isLoading={isLoadingSummary}
          />
          <SummaryCard
            title="Tickets Open"
            value={
              (summaryData?.totalCreated ?? 0) - (summaryData?.totalClosed ?? 0)
            }
            icon="clock"
            variant="warning"
            isLoading={isLoadingSummary}
          />
          <SummaryCard
            title="Avg Response Time"
            value={
              summaryData?.avgFirstResponseMinutes != null
                ? `${(summaryData.avgFirstResponseMinutes / 60).toFixed(1)}h`
                : 'N/A'
            }
            icon="flash"
            variant="default"
            isLoading={isLoadingSummary}
          />
        </>
      }
      charts={
        !isLoadingSummary ? (
          <>
            <PieChart data={categoryChartData} title="By Category" />
            <PieChart data={statusChartData} title="By Status" />
            <PieChart data={priorityChartData} title="By Priority" />
          </>
        ) : undefined
      }
    >
      {/* Ticket details table */}
      <p className="mb-4 text-lg font-semibold">Ticket Details</p>
      <BaseTable
        table={table}
        isLoading={isLoadingTickets}
        fullHeight={false}
      />

      <AdvancedFiltersModal
        isOpen={isAdvancedFiltersOpen}
        initialValues={advancedFilters}
        categories={categories}
        onApply={handleApplyAdvancedFilters}
        onClose={() => setIsAdvancedFiltersOpen(false)}
      />
    </DashboardPage>
  );
}

export default ReportsSummaryPage;
