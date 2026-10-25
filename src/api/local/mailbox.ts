/*
 * The signed-in tech's own mailbox: public replies go out from it, and client
 * answers come back into the ticket through it.
 *
 * Replace with the generated client once it is regenerated. Shapes mirror the
 * backend exactly (design-review/notes/dev/CONTRACTS.md, Ben's section).
 */
import { authorizedAxios } from '@/state/authorizedAxios';
import { requireHelpdeskApiBaseUrl } from '@/state/config';

export type MailboxStatus = 'Connected' | 'NeedsReconnect' | 'NotConnected';

export interface MailboxDto {
  address: string | null;
  displayName: string | null;
  status: MailboxStatus;
  /** "DevSink" locally: mail is logged, not sent. */
  transport: 'Graph' | 'DevSink';
  connectedAt: string | null;
  lastError: string | null;
}

/** Why a connect attempt came back as `?mailbox=error&reason=...`. */
export type MailboxConnectError = 'MailboxMismatch' | 'Denied' | 'Failed';

const base = () => `${requireHelpdeskApiBaseUrl()}/v1/me/mailbox`;

export const getMailbox = async (): Promise<MailboxDto> => {
  const { data } = await authorizedAxios.get<MailboxDto>(base());
  return data;
};

/**
 * Starts the Microsoft sign-in for the user's own mailbox. Navigate the whole
 * window to the returned URL; the backend sends the browser back to
 * `returnUrl` with `?mailbox=connected` or `?mailbox=error&reason=...`.
 */
export const connectMailbox = async (
  returnUrl: string,
): Promise<{ authorizeUrl: string }> => {
  const { data } = await authorizedAxios.post<{ authorizeUrl: string }>(
    `${base()}/connect`,
    { returnUrl },
  );
  return data;
};

export const disconnectMailbox = async (): Promise<void> => {
  await authorizedAxios.delete(base());
};
