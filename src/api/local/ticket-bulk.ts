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

/**
 * The same change for a company without Helpdesk, by principal staff: one
 * principal PATCH per ticket (status, assign, priority), since the bulk route
 * needs the company's own token. Delete has no principal route, so it fails
 * per ticket with a reason. Each ticket succeeds or fails on its own.
 */
export const bulkViaPrincipalRoutes = async (
  ticketIds: string[],
  action: BulkTicketAction,
  principalId: string,
  companyName: string,
): Promise<BulkTicketResultDto> => {
  const result: BulkTicketResultDto = { succeeded: [], failed: [] };
  if (action.action === 'Delete') {
    result.failed = ticketIds.map(ticketId => ({
      ticketId,
      code: 'Company.NotLicensed',
      reason: `Deleting needs Helpdesk enabled for ${companyName}`,
    }));
    return result;
  }
  const base = `${requireHelpdeskApiBaseUrl()}/v1/principals/${principalId}/tickets`;
  const [route, body] =
    action.action === 'Assign'
      ? ['assign', { assigneeId: action.assigneeId }]
      : action.action === 'SetStatus'
        ? [
            'status',
            { newStatus: action.status, customStatusId: action.customStatusId },
          ]
        : ['priority', { newPriority: action.priority }];
  await Promise.all(
    ticketIds.map(async ticketId => {
      try {
        await helpdeskAxios().patch(`${base}/${ticketId}/${route}`, body);
        result.succeeded.push(ticketId);
      } catch (error) {
        const data = (error as { response?: { data?: { detail?: string } } })
          ?.response?.data;
        result.failed.push({
          ticketId,
          code: 'Request.Failed',
          reason: data?.detail ?? 'The change could not be saved.',
        });
      }
    }),
  );
  return result;
};
