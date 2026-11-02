import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';
import { useCustomStatuses } from '@/components/custom-statuses/hooks/useCustomStatuses';
import { useTags } from '@/components/tags/hooks/useTags';
import type { ScopeOption } from '@/hooks/useScopeNames';
import { CUSTOM_STATUS_PREFIX } from '@/types/custom-status';
import { TicketStatus } from '@/types/ticket';
import { BaseTagSelect, BaseTagSelectItem } from '@brainforgeau/components';
import { SearchFilter } from '@brainforgeau/components/page';
import { type FC, memo, useCallback, useMemo, useState } from 'react';
import {
  ME,
  type TicketListFilterValues,
  UNASSIGNED_TOKEN,
} from '../hooks/ticketTabs';
import { useScopedAssignees } from '../hooks/useScopedAssignees';
import type { AssigneeCounts } from '../hooks/useTicketTabCounts';
import {
  AssigneeFilter,
  EMPTY,
  FIXED_TRIGGER,
  ListNote,
  MultiFilter,
  PRIORITY_ITEMS,
  summaryProps,
} from './ticket-filter-controls';

interface TicketListFiltersProps {
  values: TicketListFilterValues;
  onChange: (patch: Partial<TicketListFilterValues>) => void;
  search: string;
  onSearch: (value: string) => void;
  currentUserId?: string;
  /** Tickets per person, from the tab counts the list already loads. */
  assigneeCounts?: AssigneeCounts;
  /**
   * Whether this person works tickets. A tenant sees only their own
   * requests, so Assignee and Tags mean nothing to them.
   */
  isStaff?: boolean;
}

const TicketListFiltersImpl: FC<TicketListFiltersProps> = ({
  values,
  onChange,
  search,
  onSearch,
  currentUserId,
  assigneeCounts,
  isStaff = true,
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
    enabled: tagsWanted || values.tag.length > 0,
  });

  /*
   * Assignee and Category options come from queries this page already runs
   * (the assign picker and the Category column), so they add no request.
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

  // The assignee tokens as the picker shows them: people by id (`me` is the
  // signed-in user) and Unassigned apart.
  const people = useMemo(
    () =>
      values.assignee
        .filter(token => token !== UNASSIGNED_TOKEN)
        .map(token => (token === ME ? currentUserId : token))
        .filter((id): id is string => Boolean(id)),
    [values.assignee, currentUserId],
  );
  const includeUnassigned = values.assignee.includes(UNASSIGNED_TOKEN);

  const handleAssigneeChange = useCallback(
    (next: string[], withUnassigned: boolean) =>
      onChange({
        assignee: [
          // Choosing yourself is stored as `me`, so a saved view or a shared
          // link means whoever opens it.
          ...next.map(id => (id === currentUserId ? ME : id)),
          ...(withUnassigned ? [UNASSIGNED_TOKEN] : []),
        ],
      }),
    [onChange, currentUserId],
  );

  const handleStatusChange = useCallback(
    (value: string[]) => {
      // Selections are a mix of built-in TicketStatus enum values and
      // prefixed custom-status ids. Built-in values route to `status`, custom
      // ids to `cstatus`, and the list matches them as one selection ("any of").
      onChange({
        status: value.filter(v => !v.startsWith(CUSTOM_STATUS_PREFIX)),
        cstatus: value
          .filter(v => v.startsWith(CUSTOM_STATUS_PREFIX))
          .map(v => v.slice(CUSTOM_STATUS_PREFIX.length)),
      });
    },
    [onChange],
  );
  const handlePriorityChange = useCallback(
    (value: string[]) => onChange({ priority: value }),
    [onChange],
  );
  const handleCategoryChange = useCallback(
    (value: string[]) => onChange({ category: value }),
    [onChange],
  );
  const handleTagsChange = useCallback(
    (value: string[]) => onChange({ tag: value }),
    [onChange],
  );

  const statusValue = useMemo(
    () => [
      ...values.status,
      ...values.cstatus.map(id => `${CUSTOM_STATUS_PREFIX}${id}`),
    ],
    [values.status, values.cstatus],
  );
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
  const tagLabels = useMemo(() => {
    const names = new Map(tags.map(t => [t.id as string, t.name]));
    return values.tag.map(id => names.get(id) ?? 'Tag');
  }, [tags, values.tag]);
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

  return (
    <>
      <SearchFilter
        value={search}
        onValueChange={onSearch}
        placeholder="Search tickets..."
      />

      {isStaff && (
        <AssigneeFilter
          options={assigneeOptions}
          counts={assigneeCounts}
          people={people}
          includeUnassigned={includeUnassigned}
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
          value={values.priority}
          {...summaryProps(values.priority)}
          onValueChange={handlePriorityChange}
        >
          {PRIORITY_ITEMS}
        </BaseTagSelect>
      </div>

      <MultiFilter
        label="Category"
        plural="categories"
        options={categoryOptions}
        value={values.category.length > 0 ? values.category : EMPTY}
        onChange={handleCategoryChange}
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
            value={values.tag}
            {...summaryProps(tagLabels)}
            onValueChange={handleTagsChange}
          >
            {tagItems}
          </BaseTagSelect>
        </div>
      )}
    </>
  );
};

/**
 * Memoised: the list re-renders on every row, count and realtime update, and
 * this would rebuild every filter each time.
 */
export const TicketListFilters = memo(TicketListFiltersImpl);
