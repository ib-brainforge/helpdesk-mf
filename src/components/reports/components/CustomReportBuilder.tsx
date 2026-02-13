import { useState, useMemo, type FC } from 'react';
import { Checkbox, CheckboxGroup } from '@heroui/react';
import { Box } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import { BaseTable } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from '@tanstack/react-table';
import { useCustomReport } from '../hooks/useReports';
import type { CustomReportRequestDto, CustomReportResultDto } from '@/types';
import { TicketStatus, TicketPriority } from '@/types';

// REVIEW: Using local state for filters - can be lifted to parent if needed
interface CustomReportBuilderProps {
  onExport?: (data: CustomReportResultDto, format: 'csv' | 'excel') => void;
}

const AVAILABLE_COLUMNS = [
  { key: 'id', label: 'Ticket ID' },
  { key: 'subject', label: 'Subject' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'category', label: 'Category' },
  { key: 'submitter', label: 'Submitter' },
  { key: 'assignee', label: 'Assigned To' },
  { key: 'createdAt', label: 'Created Date' },
  { key: 'updatedAt', label: 'Last Updated' },
  { key: 'closedAt', label: 'Closed Date' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'firstResponseTime', label: 'First Response Time' },
  { key: 'resolutionTime', label: 'Resolution Time' },
  { key: 'timeSpent', label: 'Time Spent' },
  { key: 'tags', label: 'Tags' },
];

const STATUS_OPTIONS = [
  { value: TicketStatus.New, label: 'New' },
  { value: TicketStatus.InProgress, label: 'In Progress' },
  { value: TicketStatus.Closed, label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: TicketPriority.None, label: 'None' },
  { value: TicketPriority.Low, label: 'Low' },
  { value: TicketPriority.Normal, label: 'Normal' },
  { value: TicketPriority.High, label: 'High' },
  { value: TicketPriority.Critical, label: 'Critical' },
];

export const CustomReportBuilder: FC<CustomReportBuilderProps> = ({ onExport }) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'id',
    'subject',
    'status',
    'priority',
    'createdAt',
  ]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [reportData, setReportData] = useState<CustomReportResultDto | null>(null);

  const { mutate: generateReport, isPending: isGenerating } = useCustomReport();

  const handleGenerate = () => {
    const request: CustomReportRequestDto = {
      columns: selectedColumns,
      status: selectedStatuses as TicketStatus[],
      priority: selectedPriorities as TicketPriority[],
    };

    generateReport(request, {
      onSuccess: (data) => {
        setReportData(data);
      },
    });
  };

  const handleExport = (format: 'csv' | 'excel') => {
    if (reportData && onExport) {
      onExport(reportData, format);
    }
  };

  // Dynamic columns based on selected fields
  const tableColumns: ColumnDef<Record<string, unknown>, unknown>[] = useMemo(
    () =>
      selectedColumns.map((colKey) => {
        const columnDef = AVAILABLE_COLUMNS.find((c) => c.key === colKey);
        return {
          accessorKey: colKey,
          header: columnDef?.label || colKey,
          cell: (info) => {
            const value = info.getValue();
            // Format dates
            if (colKey.includes('Date') || colKey.includes('At')) {
              return value ? new Date(value as string).toLocaleString() : '-';
            }
            // Format time values
            if (colKey.includes('Time')) {
              return value ? `${(value as number).toFixed(1)}h` : '-';
            }
            return value?.toString() || '-';
          },
        };
      }),
    [selectedColumns],
  );

  const table = useReactTable({
    data: reportData?.rows || [],
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <Box title="Report Configuration">
        <div className="space-y-6">
          {/* Column Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium">Select Columns</label>
            <CheckboxGroup
              value={selectedColumns}
              onChange={(values) => setSelectedColumns(values as string[])}
              orientation="horizontal"
              className="gap-4"
            >
              {AVAILABLE_COLUMNS.map((col) => (
                <Checkbox key={col.key} value={col.key}>
                  {col.label}
                </Checkbox>
              ))}
            </CheckboxGroup>
          </div>

          {/* Status Filter */}
          <div>
            <label className="mb-2 block text-sm font-medium">Filter by Status</label>
            <BaseSelect
              selectionMode="multiple"
              selectedKeys={new Set(selectedStatuses)}
              onSelectionChange={(keys) => setSelectedStatuses(Array.from(keys) as string[])}
              placeholder="All statuses"
              className="w-full"
            >
              {STATUS_OPTIONS.map((opt) => (
                <BaseSelectItem key={opt.value}>{opt.label}</BaseSelectItem>
              ))}
            </BaseSelect>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="mb-2 block text-sm font-medium">Filter by Priority</label>
            <BaseSelect
              selectionMode="multiple"
              selectedKeys={new Set(selectedPriorities)}
              onSelectionChange={(keys) => setSelectedPriorities(Array.from(keys) as string[])}
              placeholder="All priorities"
              className="w-full"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <BaseSelectItem key={opt.value}>{opt.label}</BaseSelectItem>
              ))}
            </BaseSelect>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <BaseButton
              onClick={handleGenerate}
              isLoading={isGenerating}
              icon={<Icon name="chart-bar" className="h-4 w-4" />}
            >
              Generate Report
            </BaseButton>

            {reportData && (
              <>
                <BaseButton
                  variant="light"
                  onClick={() => handleExport('csv')}
                  icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
                >
                  Export CSV
                </BaseButton>
                <BaseButton
                  variant="light"
                  onClick={() => handleExport('excel')}
                  icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
                >
                  Export Excel
                </BaseButton>
              </>
            )}
          </div>
        </div>
      </Box>

      {/* Results Section */}
      {reportData && (
        <Box title={`Results (${reportData.totalCount} tickets)`}>
          <BaseTable
            table={table}
            isLoading={isGenerating}
            loading={{ title: 'Generating report...' }}
            fullHeight
          />
        </Box>
      )}
    </div>
  );
};
