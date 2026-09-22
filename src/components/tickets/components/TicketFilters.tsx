import { useCustomStatuses } from '@/components/custom-statuses/hooks/useCustomStatuses';
import { useTags } from '@/components/tags/hooks/useTags';
import { useHelpdeskAccess } from '@/hooks/useHelpdeskAccess';
import { type ScopeOption, useScopeNames } from '@/hooks/useScopeNames';
import { CUSTOM_STATUS_PREFIX } from '@/types/custom-status';
import {
  type TicketFilters as TicketFiltersType,
  TicketPriority,
  TicketStatus,
} from '@/types/ticket';
import {
  BaseAutocomplete,
  BaseAutocompleteItem,
  BaseButton,
  BaseInput,
  BaseTagSelect,
  BaseTagSelectItem,
  Icon,
} from '@brainforgeau/components';
import { type FC, useCallback, useMemo, useState } from 'react';

/** The "no narrowing" row. A real id can never collide with it. */
const SCOPE_ANY = '__any__';

const scopeLabel = (option: ScopeOption) =>
  option.parentName ? `${option.name} (${option.parentName})` : option.name;

/**
 * One level of the scope picker, rendered only when that level has more than
 * one option.
 *
 * A picker offering a single value narrows nothing and just reads as a control
 * that does not work. Division is the live case: no context or ticket carries
 * one today, so it stays hidden until they exist rather than showing an empty
 * list and implying the data failed to load.
 */
const ScopeLevel: FC<{
  label: string;
  options: ScopeOption[];
  value?: string;
  onChange: (id?: string) => void;
}> = ({ label, options, value, onChange }) => {
  /*
   * Typeable rather than a plain select. A principal can hold hundreds of
   * tenants, and a list that long can only be found by scrolling, which is the
   * same reason the assignee picker was a search box.
   *
   * The filtering is done here on purpose. BaseAutocomplete renders the search
   * field and reports what was typed, but it mounts RAC's AutocompleteFilter
   * with `filter: () => true`, so it never removes an item itself: whatever
   * children it is given are exactly what the popover lists. The assignee
   * version satisfied that by re-querying the directory; these options are
   * already in memory, so they are matched here and nothing is fetched.
   */
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(option =>
      scopeLabel(option).toLowerCase().includes(needle),
    );
  }, [options, query]);

  // After the hooks, never before: a picker offering one value narrows nothing.
  if (options.length < 2) return null;

  const anyLabel = `All ${label.toLowerCase()}s`;
  const selected = options.find(option => option.id === value);

  return (
    <div className="min-w-44">
      <BaseAutocomplete
        label={label}
        placeholder={anyLabel}
        className="w-full"
        selectedKey={value ?? SCOPE_ANY}
        onSelectionChange={key => {
          const next = typeof key === 'string' ? key : SCOPE_ANY;
          onChange(next === SCOPE_ANY ? undefined : next);
        }}
        // Typing narrows the list; closing forgets it, so reopening always
        // starts from the full set rather than the last search.
        onValueChange={setQuery}
        onOpenChange={open => {
          if (!open) setQuery('');
        }}
        renderSelectedItem={() => (
          <span className="truncate text-xs font-medium">
            {selected ? scopeLabel(selected) : anyLabel}
          </span>
        )}
      >
        {[
          <BaseAutocompleteItem
            key={SCOPE_ANY}
            id={SCOPE_ANY}
            textValue={anyLabel}
          >
            {anyLabel}
          </BaseAutocompleteItem>,
          ...visible.map(option => (
            <BaseAutocompleteItem
              key={option.id}
              id={option.id}
              textValue={scopeLabel(option)}
            >
              {scopeLabel(option)}
            </BaseAutocompleteItem>
          )),
        ]}
      </BaseAutocomplete>
    </div>
  );
};

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
  const { tags } = useTags();
  const { isServiceAdmin } = useHelpdeskAccess();
  const { tenantOptions, organisationOptions, divisionOptions } =
    useScopeNames();
  const activeCustomStatuses = useMemo(
    () => customStatuses.filter(s => s.isActive),
    [customStatuses],
  );

  // Custom-status option values are prefixed so they can be told apart from
  // built-in TicketStatus enum values when routing to the backend.

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

      {/* Tags, moved out of the sidebar. They are a filter, so they sit with
          the filters instead of in a rail two controls away from them. */}
      {tags.length > 0 && (
        <div className="min-w-44">
          <BaseTagSelect
            label="Tags"
            placeholder="Filter by tag"
            classNames={{ base: 'w-full [&_svg]:my-0' }}
            value={filters.tagIds ?? []}
            onValueChange={(value: string[]) =>
              onFiltersChange({
                ...filters,
                tagIds: value.length > 0 ? value : undefined,
              })
            }
          >
            {tags.map(tag => (
              <BaseTagSelectItem key={tag.id} value={tag.id as string}>
                {tag.name}
              </BaseTagSelectItem>
            ))}
          </BaseTagSelect>
        </div>
      )}

      {/* Scope, for Netcorp staff whose rows span tenants. A tenant user has
          exactly one of each, so these render nothing for them. */}
      {isServiceAdmin && (
        <>
          <ScopeLevel
            label="Tenant"
            options={tenantOptions}
            value={filters.tenantId}
            onChange={id => onFiltersChange({ ...filters, tenantId: id })}
          />
          <ScopeLevel
            label="Organisation"
            options={organisationOptions}
            value={filters.organisationId}
            onChange={id => onFiltersChange({ ...filters, organisationId: id })}
          />
          <ScopeLevel
            label="Division"
            options={divisionOptions}
            value={filters.divisionId}
            onChange={id => onFiltersChange({ ...filters, divisionId: id })}
          />
        </>
      )}

      {/* No Category filter here: the sidebar lists every category and is the
          single place to pick one. Two controls writing the same
          filters.categoryId meant the toolbar could show a category the
          sidebar had not highlighted, and vice versa. */}

      {/* No Assignee filter here either: the sidebar rail is the single place
          to pick a person, and its number is that person's ticket count in the
          same scope the tabs use. The toolbar autocomplete that used to sit
          here searched the whole directory, so it could offer people the rail
          never shows. */}

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
