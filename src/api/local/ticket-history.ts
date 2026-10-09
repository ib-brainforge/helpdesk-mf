/*
 * A ticket's History: who changed what, and when. GET /v1/tickets/{id}/history
 * is newer than the generated client.
 *
 * Replace with the generated client once it is regenerated. Shapes mirror the
 * backend exactly (agreed with Ben; the repo's PagedResult).
 */
import { type HelpdeskScope, helpdeskAxios } from '@/api/local/scoped';
import { requireHelpdeskApiBaseUrl } from '@/state/config';

/**
 * One History row. `eventType` is open ended (StatusChanged, Assigned,
 * EmailSent and so on): an unknown type still renders, from its name.
 * `details` is always an object of flat strings, possibly empty. Users are
 * ids only (resolve them through useUserEnrichment); other names are
 * snapshotted by the backend when the row is written.
 */
export interface TicketHistoryItemDto {
  id: string;
  eventType: string;
  occurredAt: string;
  /** Null when the system did it: automation, inbound email, a job. */
  actorUserId: string | null;
  details: Record<string, string | null>;
}

/** PagedResult<TicketHistoryItemDto>, newest first. */
export interface TicketHistoryPageDto {
  items: TicketHistoryItemDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage?: boolean;
}

/** The backend's default is 50 and its maximum 100. */
export const getTicketHistory = async (
  ticketId: string,
  page: number,
  pageSize: number,
  /** The ticket's company when it is not the app's own. */
  scope?: HelpdeskScope | null,
): Promise<TicketHistoryPageDto> => {
  const { data } = await helpdeskAxios(scope).get<TicketHistoryPageDto>(
    `${requireHelpdeskApiBaseUrl()}/v1/tickets/${ticketId}/history`,
    { params: { page, pageSize } },
  );
  return data;
};
