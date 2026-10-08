/*
 * Ticket comment calls and fields newer than the generated client: emailing a
 * public reply, Cc, the email details on a comment, and resending a failed
 * email.
 *
 * Replace with the generated client once it is regenerated. Shapes mirror the
 * backend exactly (design-review/notes/dev/CONTRACTS.md, Ben's section).
 */
import { authorizedAxios } from '@/state/authorizedAxios';
import { requireHelpdeskApiBaseUrl } from '@/state/config';

export interface EmailAddressDto {
  name: string;
  address: string;
}

export type CommentEmailStatus = 'Sending' | 'Sent' | 'Failed' | 'Received';

/** On a comment that went out, or came in, as email. Null otherwise. */
export interface CommentEmailDto {
  direction: 'Outbound' | 'Inbound';
  from: EmailAddressDto;
  to: EmailAddressDto[];
  cc: EmailAddressDto[];
  subject: string;
  status: CommentEmailStatus;
  statusReason: string | null;
  statusAt: string;
}

export interface AddPublicCommentBody {
  body: string;
  idempotencyKey?: string;
  /**
   * Email the reply to the ticket's contact from the tech's own mailbox. Off
   * unless asked for, so other callers never email by accident.
   */
  sendEmail?: boolean;
  /** At most 10. */
  cc?: string[];
}

/** Error codes a public reply can come back with. */
export const COMMENT_ERRORS = {
  mailboxNotConnected: 'Mailbox.NotConnected',
  noEmailRecipient: 'Ticket.NoEmailRecipient',
} as const;

const base = (ticketId: string) =>
  `${requireHelpdeskApiBaseUrl()}/v1/tickets/${ticketId}/comments`;

export const addPublicComment = async (
  ticketId: string,
  body: AddPublicCommentBody,
): Promise<unknown> => {
  const { data } = await authorizedAxios.post(base(ticketId), body);
  return data;
};

/** Resends an outbound email whose status is Failed. */
export const retryCommentEmail = async (
  ticketId: string,
  commentId: string,
): Promise<void> => {
  await authorizedAxios.post(`${base(ticketId)}/${commentId}/email/retry`);
};
