import type { MailboxStatus } from '@/api/local/mailbox';
import { describe, expect, it } from 'vitest';
import { REPLY_NOTICE_TEXT, resolveReplyDelivery } from './replyDelivery';

const base = {
  isReply: true,
  hasEmailContext: true,
  hasRecipient: true,
  mailboxStatus: 'Connected' as MailboxStatus | null,
};

describe('resolveReplyDelivery', () => {
  it('emails the reply when there is a recipient and a connected mailbox', () => {
    expect(resolveReplyDelivery(base)).toEqual({
      emailing: true,
      notice: null,
    });
  });

  it('posts on the ticket only when the mailbox is not connected', () => {
    expect(
      resolveReplyDelivery({ ...base, mailboxStatus: 'NotConnected' }),
    ).toEqual({ emailing: false, notice: 'notConnected' });
  });

  it('asks to reconnect when the mailbox needs reconnecting', () => {
    expect(
      resolveReplyDelivery({ ...base, mailboxStatus: 'NeedsReconnect' }),
    ).toEqual({ emailing: false, notice: 'needsReconnect' });
  });

  it('leaves the decision to the backend when the mailbox status is unknown', () => {
    expect(resolveReplyDelivery({ ...base, mailboxStatus: null })).toEqual({
      emailing: true,
      notice: null,
    });
  });

  it('posts on the ticket only when nobody can be emailed', () => {
    expect(resolveReplyDelivery({ ...base, hasRecipient: false })).toEqual({
      emailing: false,
      notice: 'noRecipient',
    });
  });

  it('never emails or warns for internal notes or without an email context', () => {
    expect(resolveReplyDelivery({ ...base, isReply: false })).toEqual({
      emailing: false,
      notice: null,
    });
    expect(resolveReplyDelivery({ ...base, hasEmailContext: false })).toEqual({
      emailing: false,
      notice: null,
    });
  });

  it('words the reconnect and connect notices differently', () => {
    expect(REPLY_NOTICE_TEXT.needsReconnect).not.toBe(
      REPLY_NOTICE_TEXT.notConnected,
    );
  });

  it('has text for every notice', () => {
    for (const kind of [
      'noRecipient',
      'needsReconnect',
      'notConnected',
    ] as const)
      expect(REPLY_NOTICE_TEXT[kind]).toMatch(/posted on the ticket only/);
  });
});
