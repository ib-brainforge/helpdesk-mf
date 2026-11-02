import type { TicketListDto } from '@/types/ticket';

/** A selected ticket: its id and where it lives (the pickers are scoped by it). */
export interface SelectedTicket {
  id: string;
  tenantId?: string | null;
  organisationId?: string | null;
  divisionId?: string | null;
}

/** A row as a selection entry: its id and where it lives. */
export const toSelectedTicket = (row: TicketListDto): SelectedTicket => ({
  id: row.id as string,
  tenantId: row.tenantId,
  organisationId: row.organisationId,
  divisionId: row.divisionId,
});
