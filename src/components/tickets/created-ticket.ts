import type { HelpdeskApplicationTicketsCommandsCreateTicketCreateTicketResult } from '@brainforgeau/helpdesk-client';

/** A created ticket: its id and the tenant whose helpdesk holds it. */
export interface CreatedTicket {
  id: string;
  handledByTenantId: string;
}

/**
 * Reads the 201 body of `POST v1/tickets`. The generated type leaves both
 * fields optional; a body without them is not a created ticket.
 */
export const toCreatedTicket = (
  data:
    | HelpdeskApplicationTicketsCommandsCreateTicketCreateTicketResult
    | null
    | undefined,
): CreatedTicket => {
  if (!data?.id || !data.handledByTenantId) {
    throw new Error('Unexpected response from POST v1/tickets');
  }
  return { id: data.id, handledByTenantId: data.handledByTenantId };
};
