import type { BadgeColor } from '@/components/shared';
import { TicketPriority } from '@/types/ticket';

/**
 * The single mapping from ticket priority to badge label and colour.
 *
 * Consolidated for the same reason as ticket-status-config: this switch was
 * copy-pasted byte-for-byte into the grid columns, TicketDetail and
 * TicketDetailSidebar, so a palette change meant finding all three.
 *
 * COLOUR CHOICE — a severity ramp:
 *
 *   Low      default (grey)   quiet, no signal
 *   Normal   success (green)  healthy, the expected case
 *   High     warning (amber)  wants attention
 *   Critical danger  (red)    drop everything
 *
 * Normal moved off blue so it stops colliding with the app's action colour
 * (#1868db is the New Ticket button and every link), which made a state badge
 * look interactive.
 *
 * None is retained so historical or imported rows still render their label
 * rather than falling through to "Unknown". It is no longer selectable
 * anywhere a ticket is created, edited or filtered.
 */
export const getPriorityConfig = (
  priority: TicketPriority,
): { label: string; color: BadgeColor } => {
  switch (priority) {
    case TicketPriority.Critical:
      return { label: 'Critical', color: 'danger' };
    case TicketPriority.High:
      return { label: 'High', color: 'warning' };
    case TicketPriority.Normal:
      return { label: 'Normal', color: 'success' };
    case TicketPriority.Low:
      return { label: 'Low', color: 'default' };
    case TicketPriority.None:
      return { label: 'None', color: 'default' };
    default:
      return { label: 'Unknown', color: 'default' };
  }
};
