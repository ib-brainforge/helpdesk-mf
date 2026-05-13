import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  type TicketFilters as TicketFiltersType,
  TicketPriority,
  TicketStatus,
} from '@/types/ticket';
import {
  BaseAutocomplete,
  BaseAutocompleteItem,
  BaseAvatar,
  BaseButton,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  BaseTagSelect,
  BaseTagSelectItem,
  Icon,
} from '@brainforgeau/components';
import { useAtom } from 'jotai';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  categoriesMutationAtom,
  mapCategoryToOption,
} from '../state/categories-dropdown-state';
import {
  mapUserToOption,
  usersMutationAtom,
} from '../state/users-dropdown-state';

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

  // Users search mutation for assignee autocomplete
  const [
    { mutate: searchUsers, data: usersData, isPending: isSearchingUsers },
  ] = useAtom(usersMutationAtom);

  // Categories search mutation for category autocomplete
  const [
    {
      mutate: searchCategories,
      data: categoriesData,
      isPending: isSearchingCategories,
    },
  ] = useAtom(categoriesMutationAtom);

  // Load initial data when component mounts
  useEffect(() => {
    searchUsers({ query: '' });
    searchCategories({ query: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map data to options
  const usersOptions = useMemo(
    () => (usersData ?? []).map(mapUserToOption),
    [usersData],
  );

  const categoriesOptions = useMemo(
    () => (categoriesData ?? []).map(mapCategoryToOption),
    [categoriesData],
  );

  const handlePresetChange = useCallback(
    (value: string) => {
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
          onFiltersChange({ unassignedOnly: true });
          break;
        case 'overdue':
          // REVIEW: Backend doesn't support overdue filter yet - would need to be implemented
          onFiltersChange({});
          break;
        default:
          onFiltersChange({});
      }
    },
    [onFiltersChange, currentUser],
  );

  const handleStatusChange = useCallback(
    (value: string[]) => {
      onFiltersChange({
        ...filters,
        status: value.length > 0 ? value : undefined,
      });
    },
    [filters, onFiltersChange],
  );

  const handlePriorityChange = useCallback(
    (value: string[]) => {
      onFiltersChange({
        ...filters,
        priority: value.length > 0 ? value : undefined,
      });
    },
    [filters, onFiltersChange],
  );

  const handleCategoryChange = useCallback(
    (value: string[]) => {
      onFiltersChange({
        ...filters,
        categoryId: value.length > 0 ? value : undefined,
      });
    },
    [filters, onFiltersChange],
  );

  const handleAssigneeChange = useCallback(
    (value: string[]) => {
      onFiltersChange({
        ...filters,
        assigneeId: value.length > 0 ? value : undefined,
      });
    },
    [filters, onFiltersChange],
  );

  const handleClearFilters = useCallback(() => {
    setPreset('all');
    onFiltersChange({});
    onSearch('');
  }, [onFiltersChange, onSearch]);

  return (
    <div className="flex w-full flex-wrap items-end gap-2.5">
      <div className="min-w-60 flex-1">
        <BaseInput
          label="Search"
          type="text"
          placeholder="Search tickets..."
          value={searchTerm}
          onChange={e => onSearch(e.target.value)}
          startContent={
            <Icon name="magnifying-glass" className="h-4 w-4 text-gray-400" />
          }
        />
      </div>

      <div className="min-w-40">
        <BaseSelect
          label="View Preset"
          placeholder="Select preset"
          className="w-full"
          selectedKey={preset}
          onSelectionChange={keys => {
            const value = keys as string;
            handlePresetChange(value);
          }}
        >
          <BaseSelectItem key="all" value="all">All Tickets</BaseSelectItem>
          <BaseSelectItem key="my-tickets" value="my-tickets">My Tickets</BaseSelectItem>
          <BaseSelectItem key="unassigned" value="unassigned">Unassigned</BaseSelectItem>
          <BaseSelectItem key="overdue" value="overdue">Overdue</BaseSelectItem>
        </BaseSelect>
      </div>

      <div className="min-w-40">
        <BaseTagSelect
          label="Status"
          placeholder="Filter by status"
          classNames={{ base: "w-full" }}
          value={filters.status?.map(s => s.toString()) ?? []}
          onValueChange={handleStatusChange}
        >
          <BaseTagSelectItem key={TicketStatus.New} value={TicketStatus.New}>New</BaseTagSelectItem>
          <BaseTagSelectItem key={TicketStatus.InProgress} value={TicketStatus.InProgress}>
            In Progress
          </BaseTagSelectItem>
          <BaseTagSelectItem key={TicketStatus.Closed} value={TicketStatus.Closed}>Closed</BaseTagSelectItem>
        </BaseTagSelect>
      </div>

      <div className="min-w-40">
        <BaseTagSelect
          label="Priority"
          placeholder="Filter by priority"
          classNames={{ base: "w-full" }}
          value={filters.priority?.map(p => p.toString()) ?? []}
          onValueChange={handlePriorityChange}
        >
          <BaseTagSelectItem key={TicketPriority.Critical} value={TicketPriority.Critical}>
            Critical
          </BaseTagSelectItem>
          <BaseTagSelectItem key={TicketPriority.High} value={TicketPriority.High}>High</BaseTagSelectItem>
          <BaseTagSelectItem key={TicketPriority.Normal} value={TicketPriority.Normal}>Normal</BaseTagSelectItem>
          <BaseTagSelectItem key={TicketPriority.Low} value={TicketPriority.Low}>Low</BaseTagSelectItem>
          <BaseTagSelectItem key={TicketPriority.None} value={TicketPriority.None}>None</BaseTagSelectItem>
        </BaseTagSelect>
      </div>

      <div className="min-w-40">
        <BaseAutocomplete
          label="Category"
          placeholder="Filter by category"
          className="w-full"
          isClearable
          selectedKey={filters.categoryId?.[0] ?? null}
          onSelectionChange={key => {
            const newKey = key as string | null;
            handleCategoryChange(newKey ? [newKey] : []);
          }}
          onClear={() => handleCategoryChange([])}
          onValueChange={(value: string) => {
            searchCategories({ query: value });
          }}
          onOpenChange={open => {
            if (open && !isSearchingCategories) {
              searchCategories({ query: '' });
            }
          }}
          isLoading={isSearchingCategories}
          renderSelectedItem={selectedKey => {
            const category = categoriesOptions.find(c => c.id === selectedKey);
            if (!category) return null;
            return (
              <span className="truncate text-xs font-medium">
                {category.sectionName
                  ? `${category.sectionName} / ${category.name}`
                  : category.name}
              </span>
            );
          }}
        >
          {categoriesOptions.map(category => (
            <BaseAutocompleteItem
              key={category.id}
              textValue={
                category.sectionName
                  ? `${category.sectionName} / ${category.name}`
                  : category.name
              }
            >
              <div className="flex flex-col">
                <span className="text-xs text-[#59636E] dark:text-white">
                  {category.name}
                </span>
                {category.sectionName && (
                  <span className="text-[10px] text-[#8C8F97] dark:text-gray-400">
                    {category.sectionName}
                  </span>
                )}
              </div>
            </BaseAutocompleteItem>
          ))}
        </BaseAutocomplete>
      </div>

      <div className="min-w-40">
        <BaseAutocomplete
          label="Assignee"
          placeholder="Filter by assignee"
          className="w-full"
          isClearable
          selectedKey={filters.assigneeId?.[0] ?? null}
          onSelectionChange={key => {
            const newKey = key as string | null;
            handleAssigneeChange(newKey ? [newKey] : []);
          }}
          onClear={() => handleAssigneeChange([])}
          onValueChange={(value: string) => {
            searchUsers({ query: value });
          }}
          onOpenChange={open => {
            if (open && !isSearchingUsers) {
              searchUsers({ query: '' });
            }
          }}
          isLoading={isSearchingUsers}
          renderSelectedItem={selectedKey => {
            const user = usersOptions.find(u => u.id === selectedKey);
            if (!user) return null;
            return (
              <div className="flex w-full min-w-0 flex-1 items-center gap-2">
                <BaseAvatar src={user.avatarUrl} name={user.name} size="xs" />
                <span className="truncate text-xs font-medium">
                  {user.name}
                </span>
              </div>
            );
          }}
        >
          {usersOptions.map(user => (
            <BaseAutocompleteItem key={user.id} textValue={user.name}>
              <div className="flex items-center gap-2.5">
                <BaseAvatar src={user.avatarUrl} name={user.name} size="xs" />
                <div className="flex-1">
                  <span className="text-xs text-[#59636E] dark:text-white">
                    {user.name}
                  </span>
                  {user.email && (
                    <span className="dark:text-light block text-[10px] text-[#8C8F97]">
                      {user.email}
                    </span>
                  )}
                </div>
              </div>
            </BaseAutocompleteItem>
          ))}
        </BaseAutocomplete>
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
