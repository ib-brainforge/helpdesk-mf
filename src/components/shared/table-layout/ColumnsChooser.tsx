import { BaseButton, BaseCheckbox, Icon } from '@brainforgeau/components';
import { PopoverContent, PopoverDialog } from '@heroui/react';
import {
  type DragEvent,
  type FC,
  type KeyboardEvent,
  useRef,
  useState,
} from 'react';
import type { TableLayoutController } from './useTableLayout';

/*
 * Show, hide and reorder a table's columns. A locked column (always shown)
 * cannot be hidden but still moves.
 *
 * Built only on TanStack state (through useTableLayout) and library
 * primitives, with nothing app-specific, so it can move into the shared table
 * library as it is. Reordering is native drag and drop, plus Alt+Up and
 * Alt+Down on a focused row for keyboards; no drag package is installed.
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
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const { order, hidden, lockedIds, move, setHidden } = layout;
  const visibleIds = order.filter(id => !hidden.includes(id));
  const hiddenIds = order.filter(id => hidden.includes(id));

  const onDragStart = (id: string) => (e: DragEvent) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const onDragOver = (id: string) => (e: DragEvent) => {
    if (!dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overId !== id) setOverId(id);
  };
  const endDrag = () => {
    setDragId(null);
    setOverId(null);
  };
  const onDrop = (id: string) => (e: DragEvent) => {
    e.preventDefault();
    if (dragId && dragId !== id) move(dragId, order.indexOf(id));
    endDrag();
  };
  const onRowKeyDown = (id: string) => (e: KeyboardEvent) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    move(id, order.indexOf(id) + (e.key === 'ArrowUp' ? -1 : 1));
  };

  const row = (id: string) => {
    const isLocked = lockedIds.includes(id);
    const isHidden = hidden.includes(id);
    const isDropTarget = overId === id && dragId !== id;
    return (
      <li
        key={id}
        draggable
        onDragStart={onDragStart(id)}
        onDragOver={onDragOver(id)}
        onDrop={onDrop(id)}
        onDragEnd={endDrag}
        onKeyDown={onRowKeyDown(id)}
        className={`flex h-8 items-center gap-1.5 pr-3 pl-1.5 text-sm ${
          dragId === id ? 'opacity-50' : ''
        } ${isDropTarget ? 'shadow-[inset_0_-2px_0_var(--color-blue)]' : ''}`}
      >
        <span
          aria-hidden
          className="flex w-4 cursor-grab justify-center text-default-400"
        >
          <Icon name="grip" className="h-3.5 w-3.5" />
        </span>
        <BaseCheckbox
          isSelected={!isHidden}
          isDisabled={isLocked}
          onValueChange={selected => setHidden(id, !selected)}
          className="min-w-0 flex-1"
          aria-label={`Show ${labels[id] ?? id}. Alt and the arrow keys move it`}
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
          <div className="flex items-center justify-between border-t border-[#d1d9e0] px-3 py-2">
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-blue hover:underline"
            >
              Reset to default
            </button>
            <span className="text-xs text-default-400">Drag to reorder</span>
          </div>
        </PopoverDialog>
      </PopoverContent>
    </>
  );
};
