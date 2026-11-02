import type { HelpdeskApplicationTicketsDTOsTicketListDto } from '@/api/helpdesk-client';

/** The ticket list fields that say who handles a row. */
export type RaisedAboveRowFields = Pick<
  HelpdeskApplicationTicketsDTOsTicketListDto,
  'handledByTenantId' | 'handledByLevel'
>;

/**
 * Tickets the tenant raised that a helpdesk above it works (its provider's
 * office, or Netcorp's). They sit in the one ticket list beside the tenant's
 * own, but live in another tenant: their page is the read-only projection
 * (status and public replies, with a reply box), and none of the staff
 * controls apply to them.
 */

/** Marks a ticket's URL as one handled above the tenant, so its page skips the own-ticket lookup. */
export const HANDLED_ABOVE_PARAM = 'handledBy';
export const HANDLED_ABOVE_VALUE = 'above';

/** True for a row a helpdesk above the tenant works. */
export const isHandledAbove = (row: RaisedAboveRowFields): boolean =>
  (row.handledByLevel ?? 0) > 0;

/** The page of a ticket in the one list. */
export const ticketPath = (
  id: string,
  handledAbove: boolean,
  basePath = '/tickets',
): string =>
  handledAbove
    ? `${basePath}/${id}?${HANDLED_ABOVE_PARAM}=${HANDLED_ABOVE_VALUE}`
    : `${basePath}/${id}`;

/** Whether a ticket page's search string says it is handled above. */
export const isHandledAboveSearch = (search: URLSearchParams): boolean =>
  search.get(HANDLED_ABOVE_PARAM) === HANDLED_ABOVE_VALUE;

/** A plain-text reply as the HTML a comment body is stored as. */
export const replyToHtml = (text: string): string =>
  text
    .trim()
    .split(/\n{2,}/)
    .map(
      paragraph =>
        `<p>${paragraph
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>')}</p>`,
    )
    .join('');

/**
 * Which page a ticket id opens: the office's projection when the link says
 * the ticket is handled above, or when the tenant's own lookup answers 404
 * (an unmarked old link); the tenant's own ticket page otherwise, including
 * on any other error, which that page explains itself.
 */
export const ticketPageFor = (
  markedAbove: boolean,
  ownLookupError: unknown,
): 'raised-above' | 'own' =>
  markedAbove ||
  (ownLookupError as { response?: { status?: number } } | null)?.response
    ?.status === 404
    ? 'raised-above'
    : 'own';

/** The rows of a page bulk actions can act on: never one handled above. */
export const selectableRows = <
  T extends RaisedAboveRowFields & { id?: string },
>(
  rows: readonly T[],
): Array<T & { id: string }> =>
  rows.filter((r): r is T & { id: string } => !!r.id && !isHandledAbove(r));
