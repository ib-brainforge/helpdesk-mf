import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';
import { usePresetCategories } from '@/components/categories/hooks/usePresetCategories';
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
import { type FC, type ReactNode, useCallback, useMemo, useState } from 'react';
import { useScopedAssignees } from '../hooks/useScopedAssignees';
import type { AssigneeCounts } from '../hooks/useTicketTabCounts';

/**
 * The count pill on the ticket tabs, and on each person in the Assignee
 * filter. Fixed minimum width so a row of them does not jiggle as the numbers
 * change.
 */
export const COUNT_BADGE_CLASS =
  'bg-lighter-blue text-blue inline-block min-w-[3rem] shrink-0 rounded-full px-1.5 py-0.5 text-center text-xs font-medium tabular-nums';

/** An option row: the name, and the person's ticket count at the right. */
const AssigneeOptionLabel: FC<{ name: string; count?: number }> = ({
  name,
  count,
}) => (
  <span className="flex min-w-0 items-center justify-between gap-2">
    <span className="truncate">{name}</span>
    {count !== undefined && <span className={COUNT_BADGE_CLASS}>{count}</span>}
  </span>
);

const scopeLabel = (option: ScopeOption) =>
  option.parentName ? `${option.name} (${option.parentName})` : option.name;

/**
 * One searchable single-select filter: a scope level or a category. Rendered only when that level has more than one option.
 *
 * A picker offering a single value narrows nothing and just reads as a control
 * that does not work. Division is the live case: no context or ticket carries
 * one today, so it stays hidden until they exist rather than showing an empty
 * list and implying the data failed to load.
 */
const FilterAutocomplete: FC<{
  label: string;
  /** "All companies"; defaults to "All {label}s". */
  placeholder?: string;
  options: ScopeOption[];
  /**
   * Whether this level exists anywhere in the estate, before the cascade
   * narrows it. Decides whether the control is shown at all; `options` only
   * decides what it offers.
   */
  levelExists: boolean;
  value?: string;
  onChange: (id?: string) => void;
}> = ({ label, placeholder, options, levelExists, value, onChange }) => {
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
    : (placeholder ?? `All ${label.toLowerCase()}s`);
  const selected = options.find(option => option.id === value);

  return (
    <div className="w-40">
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

/** The Unassigned option's value in the Assignee select. Never a user id. */
const UNASSIGNED = '__unassigned__';

/**
 * What the Assignee trigger says: the one name, the first name and how many
 * more, or just how many once a list of names would be too long to read.
 */
export const summariseAssignees = (labels: string[]): string => {
  if (labels.length <= 1) return labels[0] ?? '';
  if (labels.length <= 3) return `${labels[0]} +${labels.length - 1}`;
  return `${labels.length} assignees`;
};

/**
 * The last row of the Assignee list. BaseTagSelect renders whatever children
 * it is given, so this sits under the people; it hides while a search is
 * typed, when it has no text to match.
 */
const ClearAssigneesRow: FC<{ onClear: () => void }> = ({ onClear }) => (
  <div className="mt-1 border-t border-light pt-1">
    <button
      type="button"
      onClick={onClear}
      className="w-full rounded-[3px] px-2 py-1.5 text-left text-sm text-blue hover:bg-default-100"
    >
      Clear
    </button>
  </div>
);

/**
 * The Assignee filter: several people and Unassigned at once ("Eric Isik +
 * Tony Tran + Unassigned"), matched as "any of".
 *
 * The same BaseTagSelect as Status, Priority and Tags, so it looks and behaves
 * like them (checkboxes, the clear cross on the trigger), with search because
 * the list of people can be long. Unassigned is pinned at the top. The trigger
 * shows a summary rather than one chip per person, which would not fit.
 */
const AssigneeFilter: FC<{
  options: ScopeOption[];
  /** Undefined until the counts arrive; the rows then show no badge. */
  counts?: AssigneeCounts;
  people: string[];
  includeUnassigned: boolean;
  onChange: (people: string[], includeUnassigned: boolean) => void;
}> = ({ options, counts, people, includeUnassigned, onChange }) => {
  const countOf = (id: string) =>
    counts ? (counts.byId.get(id) ?? 0) : undefined;
  const nameById = useMemo(
    () => new Map(options.map(o => [o.id, o.name])),
    [options],
  );
  const value = [...people, ...(includeUnassigned ? [UNASSIGNED] : [])];
  const labels = [
    ...people.map(id => nameById.get(id) ?? 'Unknown user'),
    ...(includeUnassigned ? ['Unassigned'] : []),
  ];

  return (
    // As wide as Search, and the list wider still, so a full name and its
    // count fit without truncating.
    <div className="w-60">
      <BaseTagSelect
        label="Assignee"
        placeholder="All assignees"
        hasSearch
        classNames={{
          base: 'w-full [&_svg]:my-0',
          // The list's inner box is sized to the trigger by an inline style.
          popover: '[&>div]:!w-[300px] [&>div]:!min-w-[300px]',
          // Let the label take the row, so the count sits at the right edge.
          item: '[&>span]:min-w-0 [&>span]:flex-1',
        }}
        value={value}
        onValueChange={(next: string[]) =>
          onChange(
            next.filter(v => v !== UNASSIGNED),
            next.includes(UNASSIGNED),
          )
        }
        // Always the summary: maxVisibleTags 0 sends every selection down the
        // collapsed path, whose first tag is drawn as the whole summary and
        // whose "+N" is dropped (the summary already counts).
        maxVisibleTags={0}
        renderSelectedTag={() => (
          <span
            className="truncate text-xs font-medium"
            title={labels.join(', ')}
          >
            {summariseAssignees(labels)}
          </span>
        )}
        renderCollapsedCount={() => null}
      >
        {[
          <BaseTagSelectItem
            key={UNASSIGNED}
            value={UNASSIGNED}
            textValue="Unassigned"
          >
            <AssigneeOptionLabel name="Unassigned" count={counts?.unassigned} />
          </BaseTagSelectItem>,
          ...options.map(option => (
            <BaseTagSelectItem
              key={option.id}
              value={option.id}
              textValue={option.name}
            >
              <AssigneeOptionLabel
                name={option.name}
                count={countOf(option.id)}
              />
            </BaseTagSelectItem>
          )),
          // Someone chosen before the company or organisation changed may no
          // longer be offered; they stay listed so they can still be unticked.
          ...people
            .filter(id => !nameById.has(id))
            .map(id => (
              <BaseTagSelectItem key={id} value={id} textValue="Unknown user">
                Unknown user
              </BaseTagSelectItem>
            )),
          ...(value.length > 0
            ? [
                <ClearAssigneesRow
                  key="__clear"
                  onClear={() => onChange([], false)}
                />,
              ]
            : []),
        ]}
      </BaseTagSelect>
    </div>
  );
};

interface TicketFiltersProps {
  filters: TicketFiltersType;
  onFiltersChange: (filters: TicketFiltersType) => void;
  onSearch: (searchTerm: string) => void;
  searchTerm: string;
  onCategoryChange: (categoryId: string | null) => void;
  /** Tickets per person, from the tab counts the grid already loads. */
  assigneeCounts?: AssigneeCounts;
}

export const TicketFilters: FC<TicketFiltersProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  searchTerm,
  onCategoryChange,
  assigneeCounts,
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
  /*
   * Assignee and Category options come from queries this page already runs
   * (the assign picker and the Category column), so they add no request.
   * Assignees are the people who can work tickets in the chosen company and
   * organisation; categories are the tenant's own plus the Netcorp presets.
   */
  const { options: assigneeUsers } = useScopedAssignees({
    tenantId: filters.tenantId,
    organisationId: filters.organisationId,
  });
  const assigneeOptions: ScopeOption[] = useMemo(
    () => assigneeUsers.map(u => ({ id: u.id, name: u.name })),
    [assigneeUsers],
  );
  const { categories: ownedCategories } = useCategoriesData();
  const { presets } = usePresetCategories(ownedCategories.map(c => c.id));
  const categoryOptions: ScopeOption[] = useMemo(() => {
    const byId = new Map<string, ScopeOption>();
    for (const c of [...ownedCategories, ...presets]) {
      if (c.id) byId.set(c.id, { id: c.id, name: c.name });
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [ownedCategories, presets]);

  const activeCustomStatuses = useMemo(
    () => customStatuses.filter(s => s.isActive),
    [customStatuses],
  );

  // Custom-status option values are prefixed so they can be told apart from
  // built-in TicketStatus enum values when routing to the backend.

  const handleStatusChange = useCallback(
    (value: string[]) => {
      // Selections are a mix of built-in TicketStatus enum values and
      // prefixed custom-status ids. Built-in values route to `status`, custom
      // ids to `customStatusIds`, and the list matches them as one selection
      // ("any of"). Every custom id is kept: only the first used to be sent.
      const builtInStatuses = value.filter(
        v => !v.startsWith(CUSTOM_STATUS_PREFIX),
      );
      const customStatusIds = value
        .filter(v => v.startsWith(CUSTOM_STATUS_PREFIX))
        .map(v => v.slice(CUSTOM_STATUS_PREFIX.length));

      onFiltersChange({
        ...filters,
        status: builtInStatuses.length > 0 ? builtInStatuses : undefined,
        customStatusIds:
          customStatusIds.length > 0 ? customStatusIds : undefined,
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
      <div className="contents">
        <div className="w-60">
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

        {/* Written through onFiltersChange like every other filter; the grid
          picks the tab from the result ("Assigned to you" for exactly you,
          "Unassigned" for Unassigned alone; see tabForFilters). */}
        <AssigneeFilter
          options={assigneeOptions}
          counts={assigneeCounts}
          people={filters.assigneeId ?? []}
          includeUnassigned={Boolean(filters.includeUnassigned)}
          onChange={(people, includeUnassigned) =>
            onFiltersChange({
              ...filters,
              assigneeId: people.length > 0 ? people : undefined,
              includeUnassigned: includeUnassigned || undefined,
            })
          }
        />

        <FilterAutocomplete
          label="Category"
          placeholder="All categories"
          options={categoryOptions}
          levelExists
          value={filters.categoryId?.[0]}
          onChange={id => onCategoryChange(id ?? null)}
        />

        <div className="w-40">
          <BaseTagSelect
            label="Status"
            placeholder="Filter by status"
            classNames={{ base: 'w-full [&_svg]:my-0' }}
            value={[
              ...(filters.status?.map(s => s.toString()) ?? []),
              ...(filters.customStatusIds ?? []).map(
                id => `${CUSTOM_STATUS_PREFIX}${id}`,
              ),
            ]}
            onValueChange={handleStatusChange}
          >
            {[
              <BaseTagSelectItem
                key={TicketStatus.New}
                value={TicketStatus.New}
              >
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

        <div className="w-40">
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
          <div className="w-40">
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
      </div>

      <div className="contents">
        {/* Scope, for Netcorp staff whose rows span companies. A tenant user has
          exactly one of each, so these render nothing for them. */}
        {isServiceAdmin && (
          <>
            <FilterAutocomplete
              label="Company"
              placeholder="All companies"
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
            <FilterAutocomplete
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
            <FilterAutocomplete
              label="Division"
              options={scopedDivisions}
              levelExists={divisionOptions.length > 0}
              value={filters.divisionId}
              onChange={id => onFiltersChange({ ...filters, divisionId: id })}
            />
          </>
        )}

        {/* The Assignee and Category filters above are the only place to pick
          either: the explorer rail that also did it is gone, so two controls
          can no longer write the same field. Assignee offers the people who
          can work tickets in the chosen scope, not the whole directory. */}

        <div className="flex gap-2">
          <BaseButton
            variant="bordered"
            color="light"
            onPress={handleClearFilters}
            icon={<Icon name="x" className="h-4 w-4" />}
          >
            Clear Filters
          </BaseButton>
        </div>
      </div>
    </div>
  );
};
