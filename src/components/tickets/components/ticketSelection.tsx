import type { TicketListDto } from '@/types/ticket';
import { type FC, createContext, useContext, useEffect, useRef } from 'react';

/**
 * The bulk selection on the Tickets list, held by the grid rather than by the
 * table, so it survives paging: tick rows on page 1, go to page 2, tick more,
 * and all of them are selected. "All matching" selects every ticket the
 * filters match, across every page, without listing them (Gmail's pattern).
 *
 * The checkboxes read it through context, not through the column definitions:
 * the table keeps rendered headers and rows while its data is unchanged, so a
 * checkbox fed by the column closure never saw the header go checked.
 */
export interface SelectedTicket {
  id: string;
  tenantId?: string | null;
  organisationId?: string | null;
  divisionId?: string | null;
}

export interface TicketSelection {
  /** Every ticket the filters match is selected, on every page. */
  allMatching: boolean;
  isSelected: (id: string) => boolean;
  toggle: (row: TicketListDto) => void;
  /** Where this page stands: all its rows selected, some, or none. */
  pageState: 'all' | 'some' | 'none';
  /** Select the whole page, or clear it when it is all selected. */
  togglePage: () => void;
}

const noop = () => undefined;

export const TicketSelectionContext = createContext<TicketSelection>({
  allMatching: false,
  isSelected: () => false,
  toggle: noop,
  pageState: 'none',
  togglePage: noop,
});

const CHECKBOX_CLASS =
  'h-4 w-4 rounded border-default-300 text-primary focus:ring-primary';

/** The header checkbox: checked, indeterminate or clear, for this page. */
export const SelectPageCheckbox: FC = () => {
  const { pageState, togglePage } = useContext(TicketSelectionContext);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = pageState === 'some';
  }, [pageState]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label="Select all tickets on this page"
      checked={pageState === 'all'}
      aria-checked={pageState === 'some' ? 'mixed' : pageState === 'all'}
      onChange={togglePage}
      className={CHECKBOX_CLASS}
    />
  );
};

/** One row's checkbox. */
export const SelectRowCheckbox: FC<{ row: TicketListDto }> = ({ row }) => {
  const { isSelected, toggle } = useContext(TicketSelectionContext);
  return (
    <input
      type="checkbox"
      aria-label="Select ticket"
      checked={!!row.id && isSelected(row.id)}
      onChange={() => toggle(row)}
      className={CHECKBOX_CLASS}
    />
  );
};

/** A row as a selection entry: its id and where it lives. */
export const toSelectedTicket = (row: TicketListDto): SelectedTicket => ({
  id: row.id as string,
  tenantId: row.tenantId,
  organisationId: row.organisationId,
  divisionId: row.divisionId,
});
