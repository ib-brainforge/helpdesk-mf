import type { BadgeColor } from '@/components/shared';
import { TicketStatus } from '@/types/ticket';

/**
 * The single mapping from ticket status to badge label and colour.
 *
 * WHY THIS EXISTS: this switch was copy-pasted into three files (the grid
 * columns, TicketDetail and TicketDetailSidebar) with a fourth, subtly
 * different, copy registered in routes/layout.tsx, which had Closed as
 * `default` where the other three had `success`. Changing the palette meant
 * finding all four and they had already drifted.
 *
 * COLOUR CHOICE — attention weighted, not lifecycle:
 *
 *   New         warning (amber)  needs triage, nobody owns it yet
 *   In Progress success (green)  in hand and healthy
 *   Closed      default (grey)   done, recedes
 *
 * The previous mapping had In Progress in amber, which reads as "at risk" for
 * what is actually the healthy state, and New in blue, which collides with the
 * app's action colour (#1868db is the New Ticket button and every link) so a
 * badge looked interactive rather than like a state.
 *
 * Amber now marks the queue that wants attention, which is the question this
 * screen exists to answer. Red stays unspent, so it is still available for a
 * genuine exception such as overdue or an SLA breach.
 */
export const getStatusConfig = (
  status: TicketStatus,
): { label: string; color: BadgeColor } => {
  switch (status) {
    case TicketStatus.New:
      return { label: 'New', color: 'warning' };
    case TicketStatus.InProgress:
      return { label: 'In Progress', color: 'success' };
    case TicketStatus.Closed:
      return { label: 'Closed', color: 'default' };
    default:
      return { label: 'Unknown', color: 'default' };
  }
};
