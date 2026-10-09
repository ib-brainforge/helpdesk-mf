import { BaseTab, BaseTabs } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import {
  BaseDropdown,
  BaseDropdownItem,
  BaseDropdownMenu,
  BaseDropdownPopover,
  BaseDropdownTrigger,
} from '@brainforgeau/components/dropdown';
import {
  type FC,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  TICKET_TAB_KEYS,
  TICKET_TAB_LABELS,
  type TicketTabKey,
} from '../hooks/ticketTabs';

/*
 * Tab sizing, shared by the real tabs and the hidden copy that measures them.
 * From 1280 up (xl) the tabs use 12px padding and 14px text; below that they
 * shrink to 8px and 13px. The md:px-2 overrides the library's md:px-5.
 */
const TAB_SIZE = 'px-2 md:px-2 text-[13px] xl:px-3 xl:text-sm';
/** Room left beside the last tab, so a rounding error never overlaps. */
const SAFETY_PX = 8;

interface TicketTabsRowProps {
  selectedTab: string;
  onTabChange: (key: string) => void;
  /** A tab's label with its count badge. */
  renderTitle: (label: string, key: TicketTabKey) => ReactNode;
  /** At the right end of the row (the Columns button). */
  end?: ReactNode;
}

/**
 * The ticket tabs, the More menu and the Columns button, on one line at every
 * width: never a scrollbar, never a second line, never under Columns.
 *
 * From about 1280 all six tabs fit. Narrower, they shrink (smaller padding and
 * text). When even that runs out, the tabs that do not fit move into "More",
 * at the end of the tabs. The open tab always stays in the row, with its count.
 *
 * What fits is measured, not guessed: a hidden copy of the tab labels, sized
 * exactly like the tabs, is measured against the space the row has.
 */
export const TicketTabsRow: FC<TicketTabsRowProps> = ({
  selectedTab,
  onTabChange,
  renderTitle,
  end,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [space, setSpace] = useState<{
    available: number;
    tabWidths: number[];
    moreWidth: number;
  } | null>(null);

  const measure = useCallback(() => {
    const row = rowRef.current;
    const copy = measureRef.current;
    if (!row || !copy) return;
    const items = Array.from(copy.children) as HTMLElement[];
    const tabWidths = items
      .slice(0, TICKET_TAB_KEYS.length)
      .map(el => Math.ceil(el.getBoundingClientRect().width));
    const moreWidth = Math.ceil(
      items[TICKET_TAB_KEYS.length]?.getBoundingClientRect().width ?? 0,
    );
    const available =
      row.clientWidth - (endRef.current?.offsetWidth ?? 0) - SAFETY_PX;
    setSpace(prev =>
      prev &&
      prev.available === available &&
      prev.moreWidth === moreWidth &&
      prev.tabWidths.every((w, i) => w === tabWidths[i])
        ? prev
        : { available, tabWidths, moreWidth },
    );
  }, []);

  // Before paint, so the row never shows a frame with tabs under Columns.
  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (rowRef.current) observer.observe(rowRef.current);
    if (measureRef.current) observer.observe(measureRef.current);
    if (endRef.current) observer.observe(endRef.current);
    return () => observer.disconnect();
  }, [measure]);

  /*
   * The tabs that stay in the row, in their usual order. Everything fits, or
   * the first ones that fit beside More, with the open tab always among them
   * (taking the last place if it would otherwise be hidden).
   */
  const shown = useMemo((): TicketTabKey[] => {
    if (!space) return [...TICKET_TAB_KEYS];
    const { available, tabWidths, moreWidth } = space;
    const total = tabWidths.reduce((a, b) => a + b, 0);
    if (total <= available) return [...TICKET_TAB_KEYS];

    const room = available - moreWidth;
    const selectedIndex = TICKET_TAB_KEYS.indexOf(selectedTab as TicketTabKey);
    let count = 0;
    let used = 0;
    while (count < tabWidths.length && used + tabWidths[count] <= room) {
      used += tabWidths[count];
      count++;
    }
    if (selectedIndex < count || selectedIndex < 0) {
      return TICKET_TAB_KEYS.slice(0, Math.max(count, 1));
    }
    // Make room for the open tab at the end.
    let lead = count;
    const widthOf = (n: number) =>
      tabWidths.slice(0, n).reduce((a, b) => a + b, 0);
    while (lead > 0 && widthOf(lead) + tabWidths[selectedIndex] > room) lead--;
    return [...TICKET_TAB_KEYS.slice(0, lead), TICKET_TAB_KEYS[selectedIndex]];
  }, [space, selectedTab]);

  const hidden = TICKET_TAB_KEYS.filter(key => !shown.includes(key));

  return (
    <div ref={rowRef} className="relative mb-5 flex items-stretch">
      {/* The measuring copy: same sizing as the tabs, never seen or read. */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 flex whitespace-nowrap"
      >
        {TICKET_TAB_KEYS.map(key => (
          <span
            key={key}
            className={`flex h-11.5 items-center font-medium ${TAB_SIZE}`}
          >
            {renderTitle(TICKET_TAB_LABELS[key], key)}
          </span>
        ))}
        <span
          className={`flex h-11.5 items-center gap-1 font-medium ${TAB_SIZE}`}
        >
          More
          <Icon name="ChevronDownIcon" className="h-4 w-4" />
        </span>
      </div>

      <BaseTabs
        selectedKey={selectedTab}
        onSelectionChange={key => onTabChange(String(key))}
        className="min-w-0 shrink-0"
        classNames={{ tab: TAB_SIZE, panel: 'empty:hidden' }}
      >
        {shown.map(key => (
          <BaseTab key={key} title={renderTitle(TICKET_TAB_LABELS[key], key)} />
        ))}
      </BaseTabs>

      {hidden.length > 0 && (
        <div className="border-light flex shrink-0 items-stretch border-b-2">
          <BaseDropdown>
            <BaseDropdownTrigger>
              <button
                type="button"
                aria-label={`More tabs: ${hidden
                  .map(key => TICKET_TAB_LABELS[key])
                  .join(', ')}`}
                className={`text-gray hover:text-blue dark:text-light flex items-center gap-1 font-medium outline-none focus-visible:ring-2 focus-visible:ring-blue ${TAB_SIZE}`}
              >
                More
                <Icon name="ChevronDownIcon" className="h-4 w-4" />
              </button>
            </BaseDropdownTrigger>
            <BaseDropdownPopover>
              <BaseDropdownMenu
                aria-label="More tabs"
                onAction={key => onTabChange(String(key))}
              >
                {hidden.map(key => (
                  <BaseDropdownItem
                    key={key}
                    id={key}
                    textValue={TICKET_TAB_LABELS[key]}
                  >
                    {renderTitle(TICKET_TAB_LABELS[key], key)}
                  </BaseDropdownItem>
                ))}
              </BaseDropdownMenu>
            </BaseDropdownPopover>
          </BaseDropdown>
        </div>
      )}

      {/* The rest of the row, so the line under the tabs runs to Columns. */}
      <div className="border-light min-w-0 flex-1 border-b-2" />

      {end && (
        <div
          ref={endRef}
          className="border-light flex shrink-0 items-center border-b-2 pl-4"
        >
          {end}
        </div>
      )}
    </div>
  );
};
