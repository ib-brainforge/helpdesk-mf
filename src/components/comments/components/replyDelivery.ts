import type { MailboxStatus } from '@/api/local/mailbox';

/**
 * A public reply is always posted on the ticket. It is also emailed only when
 * it can be: somebody to send it to, and a mailbox to send it from.
 */
export interface ReplyDeliveryInput {
  /** The composer is in public-reply mode (not an internal note). */
  isReply: boolean;
  /** The ticket page supplied an email context. */
  hasEmailContext: boolean;
  /** Whether the ticket has anybody to email. */
  hasRecipient: boolean;
  /**
   * The signed-in agent's mailbox status, or null when it could not be read.
   * Unknown is not "disconnected": the backend decides and answers
   * mailboxNotConnected, which the composer handles on send.
   */
  mailboxStatus: MailboxStatus | null;
}

export type ReplyNoticeKind = 'noRecipient' | 'needsReconnect' | 'notConnected';

export interface ReplyDelivery {
  /** Send the reply as an email too (the `sendEmail` flag). */
  emailing: boolean;
  /** Why the reply will be posted on the ticket only, if so. */
  notice: ReplyNoticeKind | null;
}

export const resolveReplyDelivery = ({
  isReply,
  hasEmailContext,
  hasRecipient,
  mailboxStatus,
}: ReplyDeliveryInput): ReplyDelivery => {
  if (!isReply || !hasEmailContext) return { emailing: false, notice: null };
  // The backend tries the contact, then the requester, then whoever submitted
  // it, skipping your own address: so no recipient is usually a ticket you
  // raised for yourself.
  if (!hasRecipient) return { emailing: false, notice: 'noRecipient' };
  if (mailboxStatus === 'NeedsReconnect')
    return { emailing: false, notice: 'needsReconnect' };
  if (mailboxStatus === 'NotConnected')
    return { emailing: false, notice: 'notConnected' };
  return { emailing: true, notice: null };
};

export const REPLY_NOTICE_TEXT: Record<ReplyNoticeKind, string> = {
  noRecipient:
    'Nobody else on this ticket has an email address, so this reply is posted on the ticket only.',
  needsReconnect:
    'Your mailbox needs reconnecting, so this reply is posted on the ticket only. The requester sees it in the app.',
  notConnected:
    "Your mailbox isn't connected, so this reply is posted on the ticket only. The requester sees it in the app.",
};
