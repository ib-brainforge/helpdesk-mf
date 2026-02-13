import { type FC, useState, useCallback } from 'react';
import { BaseButton, BaseInput, BaseSelect, BaseSelectItem, Icon } from '@brainforgeau/components';
import { TicketStatus, TicketPriority, type TicketFilters as TicketFiltersType } from '@/types/ticket';
import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';
import { useUsersData } from '@/components/users/hooks/useUsersData';
import { useCurrentUser } from '@/hooks/useCurrentUser';

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
  const { currentUser } = useCurrentUser();
  const { categories } = useCategoriesData();
  const { items: users } = useUsersData();

  const handlePresetChange = useCallback((value: string) => {
    setPreset(value);

    // Apply preset filters
    switch (value) {
      case 'all':
        onFiltersChange({});
        break;
      case 'my-tickets':
        if (currentUser?.id) {
          onFiltersChange({ assigneeId: [currentUser.id] });
        }
        break;
      case 'unassigned':
        // REVIEW: Backend doesn't support unassigned filter directly - would need to be implemented
        onFiltersChange({});
        break;
      case 'overdue':
        // REVIEW: Backend doesn't support overdue filter yet - would need to be implemented
        onFiltersChange({});
        break;
      default:
        onFiltersChange({});
    }
  }, [onFiltersChange, currentUser]);

  const handleStatusChange = useCallback((value: string[]) => {
    onFiltersChange({ ...filters, status: value.length > 0 ? value : undefined });
  }, [filters, onFiltersChange]);

  const handlePriorityChange = useCallback((value: string[]) => {
    onFiltersChange({ ...filters, priority: value.length > 0 ? value : undefined });
  }, [filters, onFiltersChange]);

  const handleCategoryChange = useCallback((value: string[]) => {
    onFiltersChange({ ...filters, categoryId: value.length > 0 ? value : undefined });
  }, [filters, onFiltersChange]);

  const handleAssigneeChange = useCallback((value: string[]) => {
    onFiltersChange({ ...filters, assigneeId: value.length > 0 ? value : undefined });
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

      <div className="min-w-40">
        <BaseSelect
          label="Category"
          placeholder="Filter by category"
          className="w-full"
          selectionMode="multiple"
          selectedKeys={new Set(filters.categoryId ?? [])}
          onSelectionChange={(keys) => handleCategoryChange(Array.from(keys) as string[])}
        >
          {categories.map((category) => (
            <BaseSelectItem key={category.id}>
              {category.sectionName ? `${category.sectionName} / ${category.name}` : category.name}
            </BaseSelectItem>
          ))}
        </BaseSelect>
      </div>

      <div className="min-w-40">
        <BaseSelect
          label="Assignee"
          placeholder="Filter by assignee"
          className="w-full"
          selectionMode="multiple"
          selectedKeys={new Set(filters.assigneeId ?? [])}
          onSelectionChange={(keys) => handleAssigneeChange(Array.from(keys) as string[])}
        >
          {users.map((user) => (
            <BaseSelectItem key={user.id}>
              {user.name}
            </BaseSelectItem>
          ))}
        </BaseSelect>
      </div>

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
