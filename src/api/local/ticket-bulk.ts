/*
 * One write path for the Tickets list: assign, change status, change priority
 * or delete several tickets (or one) in a single request, scoped the same way
 * the list is read. The tenant route answers for the app's own company; the
 * principal route for every company under the principal, which is what an
 * all-companies list shows. Per-ticket calls with the app's own token could
 * not reach another company's tickets at all.
 *
 * Replace with the generated client once it is regenerated. Shapes mirror the
 * backend exactly (agreed with Ben; CONTRACTS.md, Ticket bulk actions).
 */
import { authorizedAxios } from '@/state/authorizedAxios';
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

export const bulkTicketAction = async (
  request: BulkTicketRequest,
  principalId?: string,
): Promise<BulkTicketResultDto> => {
  const base = requireHelpdeskApiBaseUrl();
  const url = principalId
    ? `${base}/v1/principals/${principalId}/tickets/bulk`
    : `${base}/v1/tickets/bulk`;
  const { data } = await authorizedAxios.post<BulkTicketResultDto>(
    url,
    request,
  );
  return data;
};
