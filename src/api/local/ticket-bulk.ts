/*
 * One write path for the Tickets list: assign, change status, change priority
 * or delete several tickets (or one) in a single request per company.
 * POST /v1/tickets/bulk answers for the company its token is for, so another
 * company's tickets are sent with that company's own token (api/local/scoped).
 *
 * Replace with the generated client once it is regenerated. Shapes mirror the
 * backend exactly (agreed with Ben; CONTRACTS.md, Ticket bulk actions).
 */
import { type HelpdeskScope, helpdeskAxios } from '@/api/local/scoped';
import { requireHelpdeskApiBaseUrl } from '@/state/config';

export type BulkTicketPriority = 'Low' | 'Normal' | 'High' | 'Critical';

export type BulkTicketAction =
  | { action: 'Assign'; assigneeId: string | null }
  | {
      action: 'SetStatus';
      status: 'New' | 'InProgress' | 'Closed';
      /** Always sent: null detaches a custom status. */
      customStatusId: string | null;
    }
  | { action: 'SetPriority'; priority: BulkTicketPriority }
  | { action: 'Delete' };

/** At most 100 ids per request. */
export type BulkTicketRequest = { ticketIds: string[] } & BulkTicketAction;

export interface BulkTicketFailureDto {
  ticketId: string;
  /** Machine readable, e.g. Ticket.NotFound. */
  code: string;
  /** A short sentence, shown to the user as is. */
  reason: string;
}

export interface BulkTicketResultDto {
  succeeded: string[];
  failed: BulkTicketFailureDto[];
}

export const BULK_TICKET_LIMIT = 100;

/** For one company: the app's own without a scope. */
export const bulkTicketAction = async (
  request: BulkTicketRequest,
  scope?: HelpdeskScope | null,
): Promise<BulkTicketResultDto> => {
  const { data } = await helpdeskAxios(scope).post<BulkTicketResultDto>(
    `${requireHelpdeskApiBaseUrl()}/v1/tickets/bulk`,
    request,
  );
  return data;
};
