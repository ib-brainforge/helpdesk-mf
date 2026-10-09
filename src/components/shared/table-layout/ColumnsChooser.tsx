import { BaseButton, BaseCheckbox, Icon } from '@brainforgeau/components';
import { PopoverContent, PopoverDialog } from '@heroui/react';
import { type FC, useRef, useState } from 'react';
import type { TableLayoutController } from './useTableLayout';

/*
 * Show and hide a table's columns, and reset them to the defaults. Column
 * order is fixed by the table itself.
 *
 * Built only on TanStack state (through useTableLayout) and library
 * primitives, with nothing app-specific, so it can move into the shared table
 * library as it is.
 */

export interface ColumnsChooserProps {
  layout: TableLayoutController;
  /** Display name per column id. */
  labels: Record<string, string>;
  /** A muted note beside a column while it is hidden, by id. */
  hints?: Record<string, string>;
  /** Shows "Saved for you automatically" once a layout is stored. */
  persisted?: boolean;
  onReset: () => void;
}

export const ColumnsChooser: FC<ColumnsChooserProps> = ({
  layout,
  labels,
  hints = {},
  persisted = true,
  onReset,
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { columns, hidden, lockedIds, setHidden } = layout;
  const visibleIds = columns.filter(id => !hidden.includes(id));
  const hiddenIds = columns.filter(id => hidden.includes(id));

  const row = (id: string) => {
    const isLocked = lockedIds.includes(id);
    const isHidden = hidden.includes(id);
    return (
      <li key={id} className="flex h-8 items-center gap-1.5 px-3 text-sm">
        <BaseCheckbox
          isSelected={!isHidden}
          isDisabled={isLocked}
          onValueChange={selected => setHidden(id, !selected)}
          className="min-w-0 flex-1"
          aria-label={`Show ${labels[id] ?? id}`}
        >
          <span className="truncate">{labels[id] ?? id}</span>
          {isHidden && hints[id] && (
            <span className="ml-1 text-[11px] text-default-400">
              {hints[id]}
            </span>
          )}
        </BaseCheckbox>
        {isLocked && (
          <span className="ml-auto shrink-0 text-xs text-default-400">
            Always shown
          </span>
        )}
      </li>
    );
  };

  return (
    <>
      <BaseButton
        ref={triggerRef}
        variant="bordered"
        color="light"
        aria-expanded={isOpen}
        onPress={() => setIsOpen(open => !open)}
        icon={<Icon name="columns" className="h-4 w-4" />}
        className={isOpen ? 'shadow-[inset_0_0_0_1px_var(--color-blue)]' : ''}
      >
        Columns
      </BaseButton>
      <PopoverContent
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="bottom end"
        className="w-72 rounded-[3px] border border-[#d1d9e0] bg-white p-0 dark:bg-dark"
      >
        <PopoverDialog aria-label="Columns" className="outline-none">
          <div className="flex items-center justify-between border-b border-[#d1d9e0] px-3 py-2.5">
            <span className="text-sm font-semibold">Columns</span>
            {persisted && (
              <span className="flex items-center gap-1 text-xs text-green-700">
                <Icon name="check" className="h-3 w-3" />
                Saved for you automatically
              </span>
            )}
          </div>
          <ul className="py-1.5">{visibleIds.map(row)}</ul>
          {hiddenIds.length > 0 && (
            <>
              <div className="border-t border-[#d1d9e0] px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-wider text-default-500 uppercase">
                Hidden
              </div>
              <ul className="pb-1.5">{hiddenIds.map(row)}</ul>
            </>
          )}
          <div className="border-t border-[#d1d9e0] px-3 py-2">
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-blue hover:underline"
            >
              Reset to default
            </button>
          </div>
        </PopoverDialog>
      </PopoverContent>
    </>
  );
};
