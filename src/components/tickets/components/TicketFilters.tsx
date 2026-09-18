import { useCustomStatuses } from '@/components/custom-statuses/hooks/useCustomStatuses';
import { UserOptionRow } from '@/components/shared';
import { CUSTOM_STATUS_PREFIX } from '@/types/custom-status';
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
  BaseTagSelect,
  BaseTagSelectItem,
  Icon,
} from '@brainforgeau/components';
import { useAtom } from 'jotai';
import { type FC, useCallback, useEffect, useMemo } from 'react';
import { useAssigneeOpenCounts } from '../hooks/useAssigneeOpenCounts';
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
  // Custom (tenant-defined) ticket statuses, merged into the Status dropdown.
  const { customStatuses } = useCustomStatuses();
  const activeCustomStatuses = useMemo(
    () => customStatuses.filter(s => s.isActive),
    [customStatuses],
  );

  // Custom-status option values are prefixed so they can be told apart from
  // built-in TicketStatus enum values when routing to the backend.

  // Users search mutation for assignee autocomplete
  const [
    { mutate: searchUsers, data: usersData, isPending: isSearchingUsers },
  ] = useAtom(usersMutationAtom);

  // Load initial data when component mounts
  useEffect(() => {
    searchUsers({ query: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map data to options
  // Live open-ticket counts, so the picker doubles as a view of who has
  // capacity rather than just a list of names.
  const { countsByUserId: openCounts } = useAssigneeOpenCounts();

  const usersOptions = useMemo(
    () => (usersData ?? []).map(mapUserToOption),
    [usersData],
  );

  const handleStatusChange = useCallback(
    (value: string[]) => {
      // Selections are a mix of built-in TicketStatus enum values and
      // prefixed custom-status ids. Built-in values route to `status`,
      // custom ids route to `customStatusId`.
      const builtInStatuses = value.filter(
        v => !v.startsWith(CUSTOM_STATUS_PREFIX),
      );
      const customStatusIds = value
        .filter(v => v.startsWith(CUSTOM_STATUS_PREFIX))
        .map(v => v.slice(CUSTOM_STATUS_PREFIX.length));

      onFiltersChange({
        ...filters,
        status: builtInStatuses.length > 0 ? builtInStatuses : undefined,
        customStatusId: customStatusIds[0],
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
            <Icon name="search" className="h-4 w-4 text-default-400" />
          }
        />
      </div>

      <div className="min-w-40">
        <BaseTagSelect
          label="Status"
          placeholder="Filter by status"
          classNames={{ base: 'w-full [&_svg]:my-0' }}
          value={[
            ...(filters.status?.map(s => s.toString()) ?? []),
            ...(filters.customStatusId
              ? [`${CUSTOM_STATUS_PREFIX}${filters.customStatusId}`]
              : []),
          ]}
          onValueChange={handleStatusChange}
        >
          {[
            <BaseTagSelectItem key={TicketStatus.New} value={TicketStatus.New}>
              New
            </BaseTagSelectItem>,
            <BaseTagSelectItem
              key={TicketStatus.InProgress}
              value={TicketStatus.InProgress}
            >
              In Progress
            </BaseTagSelectItem>,
            <BaseTagSelectItem
              key={TicketStatus.Closed}
              value={TicketStatus.Closed}
            >
              Closed
            </BaseTagSelectItem>,
            ...activeCustomStatuses.map(cs => (
              <BaseTagSelectItem
                key={`${CUSTOM_STATUS_PREFIX}${cs.id}`}
                value={`${CUSTOM_STATUS_PREFIX}${cs.id}`}
              >
                {cs.name}
              </BaseTagSelectItem>
            )),
          ]}
        </BaseTagSelect>
      </div>

      <div className="min-w-40">
        <BaseTagSelect
          label="Priority"
          placeholder="Filter by priority"
          classNames={{ base: 'w-full [&_svg]:my-0' }}
          value={filters.priority?.map(p => p.toString()) ?? []}
          onValueChange={handlePriorityChange}
        >
          <BaseTagSelectItem
            key={TicketPriority.Critical}
            value={TicketPriority.Critical}
          >
            Critical
          </BaseTagSelectItem>
          <BaseTagSelectItem
            key={TicketPriority.High}
            value={TicketPriority.High}
          >
            High
          </BaseTagSelectItem>
          <BaseTagSelectItem
            key={TicketPriority.Normal}
            value={TicketPriority.Normal}
          >
            Normal
          </BaseTagSelectItem>
          <BaseTagSelectItem
            key={TicketPriority.Low}
            value={TicketPriority.Low}
          >
            Low
          </BaseTagSelectItem>
          {/* No "None" filter: None is no longer selectable anywhere a ticket is
              created or edited, so filtering by it can only ever return legacy
              rows. The enum member is kept in the render mappings so those
              still display their label rather than falling through to
              "Unknown". */}
        </BaseTagSelect>
      </div>

      {/* No Category filter here: the sidebar lists every category and is the
          single place to pick one. Two controls writing the same
          filters.categoryId meant the toolbar could show a category the
          sidebar had not highlighted, and vice versa. */}

      {/* Wider than the other filters on purpose. BaseAutocomplete pins its
          popover to w-[var(--trigger-width)], so the dropdown can never be
          broader than this field. At min-w-40 the list was ~160px and every
          address clipped ("kim-tenant@netcorp.c"). min-w-72 leaves room for
          the avatar, the name and a full email. */}
      <div className="min-w-72">
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
            <BaseAutocompleteItem
              key={user.id}
              id={user.id}
              textValue={user.name}
            >
              <UserOptionRow
                name={user.name}
                email={user.email}
                avatarUrl={user.avatarUrl}
                openTicketCount={openCounts.get(user.id)}
              />
            </BaseAutocompleteItem>
          ))}
        </BaseAutocomplete>
      </div>

      <div className="flex gap-2">
        <BaseButton
          variant="bordered"
          onPress={handleClearFilters}
          icon={<Icon name="x" className="h-4 w-4" />}
        >
          Clear Filters
        </BaseButton>
      </div>
    </div>
  );
};
