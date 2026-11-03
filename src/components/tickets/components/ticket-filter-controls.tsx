import type { ScopeOption } from '@/hooks/useScopeNames';
import { TicketPriority } from '@/types/ticket';
import { BaseTagSelect, BaseTagSelectItem } from '@brainforgeau/components';
import { type FC, type ReactNode, memo, useMemo } from 'react';
import type { AssigneeCounts } from '../hooks/useTicketTabCounts';
import { MORE_ASSIGNEES_TEXT } from './moreAssigneesItem';

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
export const UNASSIGNED = '__unassigned__';

/**
 * A line of text in a BaseTagSelect list that is not an option ("Loading
 * tags..."). A component rather than a bare element because BaseTagSelect
 * hands every child a `value` prop, which a <div> would print as an attribute.
 */
export const ListNote: FC<{ children: ReactNode }> = ({ children }) => (
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

export const summaryProps = (labels: string[]) => ({
  maxVisibleTags: 0,
  renderSelectedTag: () => <SelectionSummary labels={labels} />,
  renderCollapsedCount: () => null,
});

/** The trigger never wraps or grows: the summary truncates inside it. */
export const FIXED_TRIGGER = 'flex-nowrap overflow-hidden';

const AssigneeFilterImpl: FC<{
  options: ScopeOption[];
  /** Undefined until the counts arrive; the rows then show no badge. */
  counts?: AssigneeCounts;
  people: string[];
  includeUnassigned: boolean;
  onChange: (people: string[], includeUnassigned: boolean) => void;
  /** Reports the typed search so the caller can search on the server. */
  onSearchChange?: (term: string) => void;
  /** More people match than the options hold. */
  hasMoreAssignees?: boolean;
}> = ({
  options,
  counts,
  people,
  includeUnassigned,
  onChange,
  onSearchChange,
  hasMoreAssignees = false,
}) => {
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
        onSearchTermChange={onSearchChange}
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
          ...(hasMoreAssignees
            ? [
                <BaseTagSelectItem
                  key="__more"
                  value="__more"
                  textValue={MORE_ASSIGNEES_TEXT}
                  isDisabled
                >
                  {MORE_ASSIGNEES_TEXT}
                </BaseTagSelectItem>,
              ]
            : []),
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

export const AssigneeFilter = memo(AssigneeFilterImpl);

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
export const EMPTY: string[] = [];

/** Priority options never change, so they are built once. */
export const PRIORITY_ITEMS = [
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
