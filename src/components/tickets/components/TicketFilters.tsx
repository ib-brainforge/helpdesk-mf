import { type FC, useState, useCallback } from 'react';
import { BaseButton, BaseInput, BaseSelect, BaseSelectItem, Icon } from '@brainforgeau/components';
import { TicketStatus, TicketPriority, type TicketFilters as TicketFiltersType } from '@/types/ticket';

interface TicketFiltersProps {
  filters: TicketFiltersType;
  onFiltersChange: (filters: TicketFiltersType) => void;
  onSearch: (searchTerm: string) => void;
  searchTerm: string;
}

export const TicketFilters: FC<TicketFiltersProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  searchTerm,
}) => {
  const [preset, setPreset] = useState<string>('all');

  const handlePresetChange = useCallback((value: string) => {
    setPreset(value);

    // Apply preset filters
    switch (value) {
      case 'all':
        onFiltersChange({});
        break;
      case 'my-tickets':
        // TODO: Get current user ID
        onFiltersChange({ assigneeId: ['current-user'] });
        break;
      case 'unassigned':
        onFiltersChange({ assigneeId: [''] });
        break;
      case 'overdue':
        // TODO: Implement overdue filter when backend supports it
        onFiltersChange({});
        break;
      default:
        onFiltersChange({});
    }
  }, [onFiltersChange]);

  const handleStatusChange = useCallback((value: string[]) => {
    onFiltersChange({ ...filters, status: value.length > 0 ? value : undefined });
  }, [filters, onFiltersChange]);

  const handlePriorityChange = useCallback((value: string[]) => {
    onFiltersChange({ ...filters, priority: value.length > 0 ? value : undefined });
  }, [filters, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    setPreset('all');
    onFiltersChange({});
    onSearch('');
  }, [onFiltersChange, onSearch]);

  return (
    <div className="flex w-full flex-wrap items-end gap-2.5">
      <div className="min-w-60 flex-1">
        <BaseInput
          type="text"
          placeholder="Search tickets..."
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          startContent={<Icon name="magnifying-glass" className="h-4 w-4 text-gray-400" />}
        />
      </div>

      <div className="min-w-40">
        <BaseSelect
          label="View Preset"
          placeholder="Select preset"
          className="w-full"
          selectedKeys={new Set([preset])}
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0] as string;
            handlePresetChange(value);
          }}
        >
          <BaseSelectItem key="all">All Tickets</BaseSelectItem>
          <BaseSelectItem key="my-tickets">My Tickets</BaseSelectItem>
          <BaseSelectItem key="unassigned">Unassigned</BaseSelectItem>
          <BaseSelectItem key="overdue">Overdue</BaseSelectItem>
        </BaseSelect>
      </div>

      <div className="min-w-40">
        <BaseSelect
          label="Status"
          placeholder="Filter by status"
          className="w-full"
          selectionMode="multiple"
          selectedKeys={new Set(filters.status?.map(s => s.toString()) ?? [])}
          onSelectionChange={(keys) => handleStatusChange(Array.from(keys) as string[])}
        >
          <BaseSelectItem key={TicketStatus.New}>New</BaseSelectItem>
          <BaseSelectItem key={TicketStatus.InProgress}>In Progress</BaseSelectItem>
          <BaseSelectItem key={TicketStatus.Closed}>Closed</BaseSelectItem>
        </BaseSelect>
      </div>

      <div className="min-w-40">
        <BaseSelect
          label="Priority"
          placeholder="Filter by priority"
          className="w-full"
          selectionMode="multiple"
          selectedKeys={new Set(filters.priority?.map(p => p.toString()) ?? [])}
          onSelectionChange={(keys) => handlePriorityChange(Array.from(keys) as string[])}
        >
          <BaseSelectItem key={TicketPriority.Critical}>Critical</BaseSelectItem>
          <BaseSelectItem key={TicketPriority.High}>High</BaseSelectItem>
          <BaseSelectItem key={TicketPriority.Normal}>Normal</BaseSelectItem>
          <BaseSelectItem key={TicketPriority.Low}>Low</BaseSelectItem>
          <BaseSelectItem key={TicketPriority.None}>None</BaseSelectItem>
        </BaseSelect>
      </div>

      {/* TODO: Add Category and Assignee filters when backend supports them */}

      <div className="flex gap-2">
        <BaseButton
          variant="bordered"
          onPress={handleClearFilters}
          icon={<Icon name="x-mark" className="h-4 w-4" />}
        >
          Clear Filters
        </BaseButton>
      </div>
    </div>
  );
};
