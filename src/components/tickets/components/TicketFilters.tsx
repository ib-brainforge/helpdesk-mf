import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';
import { useCustomStatuses } from '@/components/custom-statuses/hooks/useCustomStatuses';
import { useTags } from '@/components/tags/hooks/useTags';
import type { ScopeOption } from '@/hooks/useScopeNames';
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
import {
  type FC,
  type ReactNode,
  memo,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { useScopedAssignees } from '../hooks/useScopedAssignees';
import type { AssigneeCounts } from '../hooks/useTicketTabCounts';

/**
 * The count pill on the ticket tabs, and on each person in the Assignee
 * filter. Fixed minimum width so a row of them does not jiggle as the numbers
 * change.
 */
export const COUNT_BADGE_CLASS =
  'bg-lighter-blue text-blue inline-block min-w-[3rem] shrink-0 rounded-full px-1.5 py-0.5 text-center text-xs font-medium tabular-nums';

const scopeLabel = (option: ScopeOption) =>
  option.parentName ? `${option.name} (${option.parentName})` : option.name;

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

/** The Unassigned option's value in the Assignee select. Never a user id. */
const UNASSIGNED = '__unassigned__';

/**
 * A line of text in a BaseTagSelect list that is not an option ("Loading
 * tags..."). A component rather than a bare element because BaseTagSelect
 * hands every child a `value` prop, which a <div> would print as an attribute.
 */
const ListNote: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="text-default-500 px-2 py-1.5 text-sm">{children}</div>
);

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
/**
 * How every multi-select in the filter bar shows what is chosen: the first
 * value, then "+N" (for example "New +1"), on one line that never grows the
 * field. Chips with their own X used to overflow the fixed width, so the last
 * X sat over the next filter. The full list is in the title tooltip and, with
 * ticks, in the open list.
 *
 * maxVisibleTags 0 sends every selection down BaseTagSelect's collapsed path,
 * whose first tag is drawn as this summary and whose own count is dropped.
 */
const SelectionSummary: FC<{ labels: string[] }> = ({ labels }) => (
  <span
    className="flex min-w-0 items-center text-xs font-medium"
    title={labels.join(', ')}
  >
    <span className="truncate">{labels[0]}</span>
    {labels.length > 1 && (
      <span className="text-default-500 ml-1 shrink-0">
        +{labels.length - 1}
      </span>
    )}
  </span>
);

const summaryProps = (labels: string[]) => ({
  maxVisibleTags: 0,
  renderSelectedTag: () => <SelectionSummary labels={labels} />,
  renderCollapsedCount: () => null,
});

/** The trigger never wraps or grows: the summary truncates inside it. */
const FIXED_TRIGGER = 'flex-nowrap overflow-hidden';

const AssigneeFilterImpl: FC<{
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
    <div className="w-44">
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
          trigger: FIXED_TRIGGER,
        }}
        value={value}
        onValueChange={(next: string[]) =>
          onChange(
            next.filter(v => v !== UNASSIGNED),
            next.includes(UNASSIGNED),
          )
        }
        {...summaryProps(labels)}
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

const AssigneeFilter = memo(AssigneeFilterImpl);

/** A company heading in the grouped Organisation list. Not an option. */
const GroupHeading: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="text-default-500 px-2 pt-2 pb-1 text-xs font-bold">
    {children}
  </div>
);

/**
 * Category, Company and Organisation: several values at once, matched as "any
 * of". The same BaseTagSelect, search, summary trigger and Clear row as
 * Assignee, so every multi-select in the bar behaves alike.
 *
 * `grouped` lists the options under their parent's name (organisations under
 * their company). A heading is not an option, so it hides while a search is
 * typed; each option's textValue carries the company name, so searching for a
 * company still finds its organisations.
 */
const MultiFilterImpl: FC<{
  label: string;
  /** "categories", for the placeholder and the "N categories" summary. */
  plural: string;
  options: ScopeOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  grouped?: boolean;
}> = ({ label, plural, options, value, onChange, grouped }) => {
  const labelById = useMemo(
    () => new Map(options.map(o => [o.id, o.name])),
    [options],
  );
  const items = useMemo(() => {
    const rows: ReactNode[] = [];
    let group: string | undefined;
    for (const option of options) {
      if (grouped && (rows.length === 0 || option.parentName !== group)) {
        group = option.parentName;
        rows.push(
          <GroupHeading key={`__group-${option.parentId ?? option.id}`}>
            {group ?? 'Other'}
          </GroupHeading>,
        );
      }
      rows.push(
        <BaseTagSelectItem
          key={option.id}
          value={option.id}
          textValue={grouped ? scopeLabel(option) : option.name}
        >
          {option.name}
        </BaseTagSelectItem>,
      );
    }
    return rows;
  }, [options, grouped]);
  const labels = value.map(id => labelById.get(id) ?? 'Unknown');
  const isEmpty = options.length === 0 && value.length === 0;

  return (
    <div className="w-36">
      <BaseTagSelect
        label={label}
        placeholder={isEmpty ? `No ${plural}` : `All ${plural}`}
        isDisabled={isEmpty}
        hasSearch
        classNames={{
          base: 'w-full [&_svg]:my-0',
          popover: '[&>div]:!w-[280px] [&>div]:!min-w-[280px]',
          trigger: FIXED_TRIGGER,
        }}
        value={value}
        onValueChange={onChange}
        {...summaryProps(labels)}
      >
        {[
          ...items,
          // A value no longer offered (its company was unticked, or it was
          // removed) stays listed so it can still be unticked.
          ...value
            .filter(id => !labelById.has(id))
            .map(id => (
              <BaseTagSelectItem key={id} value={id} textValue="Unknown">
                Unknown
              </BaseTagSelectItem>
            )),
          ...(value.length > 0
            ? [<ClearAssigneesRow key="__clear" onClear={() => onChange([])} />]
            : []),
        ]}
      </BaseTagSelect>
    </div>
  );
};

export const MultiFilter = memo(MultiFilterImpl);

/** A stable empty selection, so a memoised picker is not re-rendered by `[]`. */
const EMPTY: string[] = [];

/** Priority options never change, so they are built once. */
const PRIORITY_ITEMS = [
  <BaseTagSelectItem
    key={TicketPriority.Critical}
    value={TicketPriority.Critical}
  >
    Critical
  </BaseTagSelectItem>,
  <BaseTagSelectItem key={TicketPriority.High} value={TicketPriority.High}>
    High
  </BaseTagSelectItem>,
  <BaseTagSelectItem key={TicketPriority.Normal} value={TicketPriority.Normal}>
    Normal
  </BaseTagSelectItem>,
  <BaseTagSelectItem key={TicketPriority.Low} value={TicketPriority.Low}>
    Low
  </BaseTagSelectItem>,
  // No "None" filter: None is no longer selectable anywhere a ticket is
  // created or edited, so filtering by it can only ever return legacy rows.
  // The enum member is kept in the render mappings so those still display
  // their label rather than falling through to "Unknown".
];

interface TicketFiltersProps {
  filters: TicketFiltersType;
  onFiltersChange: (filters: TicketFiltersType) => void;
  onSearch: (searchTerm: string) => void;
  searchTerm: string;
  onCategoryChange: (categoryIds: string[]) => void;
  /** Tickets per person, from the tab counts the grid already loads. */
  assigneeCounts?: AssigneeCounts;
  /** What the open tab sets by itself: Clear filters goes back to this. */
  baseline?: TicketFiltersType;
  /**
   * Whether this person works tickets. A customer sees only their own
   * requests, so Assignee and Tags mean nothing to them.
   */
  isStaff?: boolean;
}

/** The filter values that narrow the list, ignoring empties and order. */
const FILTER_KEYS = [
  'assigneeId',
  'includeUnassigned',
  'status',
  'customStatusIds',
  'priority',
  'categoryId',
  'tagIds',
  'overdueOnly',
] as const;
const normalise = (v: unknown) =>
  Array.isArray(v)
    ? v.length
      ? [...v].map(String).sort().join('|')
      : ''
    : v
      ? String(v)
      : '';
const sameFilters = (a: TicketFiltersType, b: TicketFiltersType) =>
  FILTER_KEYS.every(
    k =>
      normalise((a as Record<string, unknown>)[k]) ===
      normalise((b as Record<string, unknown>)[k]),
  );

const TicketFiltersImpl: FC<TicketFiltersProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  searchTerm,
  onCategoryChange,
  assigneeCounts,
  isStaff = true,
  baseline,
}) => {
  // Custom (tenant-defined) ticket statuses, merged into the Status dropdown.
  const { customStatuses } = useCustomStatuses();
  /*
   * Tags load when the Tags filter is first opened (or focused), or straight
   * away when tags are already chosen so their chips have names. Loading them
   * with the page cost a slow request on every list load for a filter most
   * visits never open.
   */
  const [tagsWanted, setTagsWanted] = useState(false);
  const wantTags = useCallback(() => setTagsWanted(true), []);
  const { tags, isLoading: loadingTags } = useTags(undefined, {
    enabled: tagsWanted || Boolean(filters.tagIds?.length),
  });

  /*
   * Assignee and Category options come from queries this page already runs
   * (the assign picker and the Category column), so they add no request.
   * Assignees are the people who can work tickets in the tenant; categories
   * are the tenant's own.
   */
  const { options: assigneeUsers } = useScopedAssignees({});
  const assigneeOptions: ScopeOption[] = useMemo(
    () => assigneeUsers.map(u => ({ id: u.id, name: u.name })),
    [assigneeUsers],
  );
  const { categories: ownedCategories } = useCategoriesData();
  const categoryOptions: ScopeOption[] = useMemo(() => {
    const byId = new Map<string, ScopeOption>();
    for (const c of ownedCategories) {
      if (c.id) byId.set(c.id, { id: c.id, name: c.name });
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [ownedCategories]);

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

  // Stable callbacks for the memoised pickers below: an inline arrow would be
  // a new prop on every render and undo the memo.
  const handleAssigneeChange = useCallback(
    (people: string[], includeUnassigned: boolean) =>
      onFiltersChange({
        ...filters,
        assigneeId: people.length > 0 ? people : undefined,
        includeUnassigned: includeUnassigned || undefined,
      }),
    [filters, onFiltersChange],
  );
  const handleTagsChange = useCallback(
    (value: string[]) =>
      onFiltersChange({
        ...filters,
        tagIds: value.length > 0 ? value : undefined,
      }),
    [filters, onFiltersChange],
  );

  const statusValue = useMemo(
    () => [
      ...(filters.status?.map(s => s.toString()) ?? []),
      ...(filters.customStatusIds ?? []).map(
        id => `${CUSTOM_STATUS_PREFIX}${id}`,
      ),
    ],
    [filters.status, filters.customStatusIds],
  );
  // The words for each chosen status, priority and tag, for the summaries.
  const statusLabels = useMemo(() => {
    const names: Record<string, string> = {
      [TicketStatus.New]: 'New',
      [TicketStatus.InProgress]: 'In Progress',
      [TicketStatus.Closed]: 'Closed',
    };
    for (const cs of activeCustomStatuses)
      names[`${CUSTOM_STATUS_PREFIX}${cs.id}`] = cs.name;
    return statusValue.map(v => names[v] ?? 'Unknown status');
  }, [statusValue, activeCustomStatuses]);
  const priorityValue = useMemo(
    () => filters.priority?.map(p => p.toString()) ?? [],
    [filters.priority],
  );
  const tagLabels = useMemo(() => {
    const names = new Map(tags.map(t => [t.id as string, t.name]));
    return (filters.tagIds ?? []).map(id => names.get(id) ?? 'Tag');
  }, [tags, filters.tagIds]);
  const statusItems = useMemo(
    () => [
      <BaseTagSelectItem key={TicketStatus.New} value={TicketStatus.New}>
        New
      </BaseTagSelectItem>,
      <BaseTagSelectItem
        key={TicketStatus.InProgress}
        value={TicketStatus.InProgress}
      >
        In Progress
      </BaseTagSelectItem>,
      <BaseTagSelectItem key={TicketStatus.Closed} value={TicketStatus.Closed}>
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
    ],
    [activeCustomStatuses],
  );
  const tagItems = useMemo(
    () =>
      tags.length > 0
        ? tags.map(tag => (
            <BaseTagSelectItem key={tag.id} value={tag.id as string}>
              {tag.name}
            </BaseTagSelectItem>
          ))
        : // Not loaded yet, or the company has none: say which.
          [
            <ListNote key="__tags-state">
              {loadingTags || !tagsWanted ? 'Loading tags...' : 'No tags yet'}
            </ListNote>,
          ],
    [tags, loadingTags, tagsWanted],
  );

  const handleClearFilters = useCallback(() => {
    onFiltersChange({});
    onSearch('');
  }, [onFiltersChange, onSearch]);

  /*
   * The less used filters sit behind "More filters", so the bar is one row.
   * How many of them are set shows on the button, and they open by themselves
   * when the page loads with one set, so a narrowed list is never unexplained.
   */
  const moreCount =
    (filters.categoryId?.length ?? 0) + (filters.tagIds?.length ?? 0);
  const [moreOpen, setMoreOpen] = useState(moreCount > 0);
  const showMore = moreOpen || moreCount > 0;

  // Something beyond what the tab itself sets (Open sets Status, say), so
  // Clear filters only appears when there is something of yours to clear.
  const hasAnyFilter =
    Boolean(searchTerm) || !sameFilters(filters, baseline ?? {});

  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex w-full flex-wrap items-end gap-2.5">
        <div className="w-44">
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

        {isStaff && (
          <AssigneeFilter
            options={assigneeOptions}
            counts={assigneeCounts}
            people={filters.assigneeId ?? []}
            includeUnassigned={Boolean(filters.includeUnassigned)}
            onChange={handleAssigneeChange}
          />
        )}

        <div className="w-36">
          <BaseTagSelect
            label="Status"
            placeholder="Any status"
            classNames={{ base: 'w-full [&_svg]:my-0', trigger: FIXED_TRIGGER }}
            value={statusValue}
            {...summaryProps(statusLabels)}
            onValueChange={handleStatusChange}
          >
            {statusItems}
          </BaseTagSelect>
        </div>

        <div className="w-36">
          <BaseTagSelect
            label="Priority"
            placeholder="Any priority"
            classNames={{ base: 'w-full [&_svg]:my-0', trigger: FIXED_TRIGGER }}
            value={priorityValue}
            {...summaryProps(priorityValue)}
            onValueChange={handlePriorityChange}
          >
            {PRIORITY_ITEMS}
          </BaseTagSelect>
        </div>

        <BaseButton
          variant="bordered"
          color="light"
          aria-expanded={showMore}
          onPress={() => setMoreOpen(open => !(open || moreCount > 0))}
          icon={<Icon name="filter" className="h-4 w-4" />}
        >
          More filters
          {moreCount > 0 && (
            <span className={COUNT_BADGE_CLASS}>{moreCount}</span>
          )}
        </BaseButton>

        {hasAnyFilter && (
          <BaseButton
            variant="ghost"
            onPress={handleClearFilters}
            icon={<Icon name="x" className="h-4 w-4" />}
          >
            {/* Resets every filter, those under More filters included, and the
              search. The tab stays. */}
            Clear filters
          </BaseButton>
        )}
      </div>

      {showMore && (
        <div className="flex w-full flex-wrap items-end gap-2.5">
          <MultiFilter
            label="Category"
            plural="categories"
            options={categoryOptions}
            value={filters.categoryId ?? EMPTY}
            onChange={onCategoryChange}
          />

          {/* Tags load when this filter is first opened (see wantTags). */}
          {isStaff && (
            <div
              className="w-40"
              onPointerDownCapture={wantTags}
              onFocusCapture={wantTags}
            >
              <BaseTagSelect
                label="Tags"
                placeholder="Any tag"
                classNames={{
                  base: 'w-full [&_svg]:my-0',
                  trigger: FIXED_TRIGGER,
                }}
                value={filters.tagIds ?? []}
                {...summaryProps(tagLabels)}
                onValueChange={handleTagsChange}
              >
                {tagItems}
              </BaseTagSelect>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Memoised: the grid re-renders on every row, count and realtime update, and
 * this rebuilt every filter each time. The grid passes stable callbacks, so it
 * now renders when the filters, the search text or the counts change.
 */
export const TicketFilters = memo(TicketFiltersImpl);
