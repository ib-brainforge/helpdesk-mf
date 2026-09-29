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
  /**
   * Whether this level exists anywhere in the estate, before the cascade
   * narrows it. Decides whether the control is shown at all; `options` only
   * decides what it offers.
   */
  levelExists: boolean;
  value?: string;
  onChange: (id?: string) => void;
}> = ({ label, options, levelExists, value, onChange }) => {
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

  /*
   * After the hooks, never before.
   *
   * Hidden only when the level does not exist in the estate at all and nothing
   * is chosen, so the control is either always there or never there.
   *
   * It used to hide whenever the CASCADED list was empty. Picking a tenant that
   * owns no organisations then removed the Organisation control, the search
   * box grew into the gap, and every filter to its right slid across by one
   * control's width under the pointer. A tenant with nothing beneath it now
   * keeps the control in place, disabled and saying so.
   *
   * Before that it hid at fewer than two options, on the reasoning that a picker
   * offering one value narrows nothing. That held while every level listed the
   * whole estate and so never had fewer than two. Once the levels cascade it is
   * actively wrong: choosing a tenant that owns a single organisation would
   * drop this list to one and make the Organisation control disappear, so the
   * filter bar reshuffled as you picked a tenant, and a selection already made
   * could no longer be seen or cleared. A control that stays put and offers one
   * value is better than one that comes and goes.
   */
  if (!levelExists && !value) return null;

  const isEmpty = options.length === 0 && !value;
  const anyLabel = isEmpty
    ? `No ${label.toLowerCase()}s`
    : `All ${label.toLowerCase()}s`;
  const selected = options.find(option => option.id === value);

  return (
    <div className="min-w-44">
      <BaseAutocomplete
        label={label}
        placeholder={anyLabel}
        isDisabled={isEmpty}
        className="w-full"
        // null, not a sentinel key: "All tenants" is the empty state, so
        // nothing is selected when no scope is chosen. Pointing selectedKey at
        // a key the list no longer contains would leave the control believing
        // in an item that is not there.
        selectedKey={value ?? null}
        onSelectionChange={key => {
          onChange(typeof key === 'string' ? key : undefined);
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
        {/*
          Only real scopes are listed. "All tenants" is the placeholder shown
          while nothing is chosen, not a row you pick, which is how the tracker
          pool's tenant and organisation filters read. Offering it as an item
          made the empty state look like a choice among the others and put a
          synthetic entry at the top of every list. Resetting is what the Clear
          Filters button is for.
        */}
        {visible.map(option => (
          <BaseAutocompleteItem
            key={option.id}
            id={option.id}
            textValue={scopeLabel(option)}
          >
            {scopeLabel(option)}
          </BaseAutocompleteItem>
        ))}
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

  /*
   * The scope pickers cascade: each list shows only what sits under the level
   * chosen above it, the same way the tracker pool's tenant and organisation
   * filters behave.
   *
   * WHY. These three used to list the whole estate regardless of each other,
   * so the Organisation dropdown offered every organisation under every tenant
   * while a tenant was already selected. Most of what it offered could only
   * ever return nothing, and picking one of those silently emptied the grid.
   * Labelling each option with its tenant name made that legible but still left
   * the work of avoiding the impossible combinations to the person reading it.
   *
   * With no tenant chosen the full list is correct and stays.
   */
  const scopedOrganisations = useMemo(
    () =>
      filters.tenantId
        ? organisationOptions.filter(o => o.parentId === filters.tenantId)
        : organisationOptions,
    [organisationOptions, filters.tenantId],
  );

  const scopedDivisions = useMemo(
    () =>
      filters.organisationId
        ? divisionOptions.filter(d => d.parentId === filters.organisationId)
        : // No organisation chosen, but a tenant might be: fall back to every
          // division under that tenant's organisations rather than the estate.
          filters.tenantId
          ? divisionOptions.filter(d =>
              scopedOrganisations.some(o => o.id === d.parentId),
            )
          : divisionOptions,
    [
      divisionOptions,
      scopedOrganisations,
      filters.organisationId,
      filters.tenantId,
    ],
  );
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
            levelExists={tenantOptions.length > 0}
            value={filters.tenantId}
            // Changing the tenant drops the organisation and division with it.
            // They sit underneath the old tenant, so keeping them would leave a
            // combination that describes nothing: "this tenant, and an
            // organisation belonging to a different one" matches no ticket, and
            // the grid would read empty for a reason nothing on screen explains.
            onChange={id =>
              onFiltersChange({
                ...filters,
                tenantId: id,
                organisationId: undefined,
                divisionId: undefined,
              })
            }
          />
          <ScopeLevel
            label="Organisation"
            options={scopedOrganisations}
            levelExists={organisationOptions.length > 0}
            value={filters.organisationId}
            onChange={id =>
              onFiltersChange({
                ...filters,
                organisationId: id,
                divisionId: undefined,
              })
            }
          />
          <ScopeLevel
            label="Division"
            options={scopedDivisions}
            levelExists={divisionOptions.length > 0}
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
