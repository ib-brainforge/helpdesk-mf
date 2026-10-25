import {
  type MailboxConnectError,
  type MailboxDto,
  connectMailbox,
  getMailbox,
} from '@/api/local/mailbox';
import { useSearchParams } from '@modern-js/runtime/router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

export const MAILBOX_QUERY_KEY = ['me', 'mailbox'] as const;

/**
 * The signed-in tech's mailbox. Personal, so not keyed by context. Its
 * status only changes through the connect flow (a full page round trip) or
 * a reply failing, which invalidates it, so five minutes is plenty.
 */
export const useMailbox = () => {
  const query = useQuery<MailboxDto>({
    queryKey: MAILBOX_QUERY_KEY,
    queryFn: getMailbox,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const connect = useMutation({
    mutationFn: () => {
      // Back to this exact page, minus any previous result.
      const url = new URL(window.location.href);
      url.searchParams.delete('mailbox');
      url.searchParams.delete('reason');
      return connectMailbox(url.toString());
    },
    onSuccess: ({ authorizeUrl }) => {
      // A full page navigation, not a popup: Microsoft's sign-in sends the
      // browser back to returnUrl when it is done.
      window.location.assign(authorizeUrl);
    },
  });

  return {
    mailbox: query.data ?? null,
    isConnected: query.data?.status === 'Connected',
    isLoading: query.isLoading,
    connect: connect.mutate,
    isConnecting: connect.isPending,
  };
};

/**
 * Reads the result of a mailbox connect when Microsoft sends the browser back
 * (`?mailbox=connected` or `?mailbox=error&reason=...`), once, then removes
 * it from the URL so a refresh does not repeat it.
 */
export const useMailboxConnectResult = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<{
    ok: boolean;
    reason?: MailboxConnectError;
  } | null>(null);

  const outcome = searchParams.get('mailbox');
  useEffect(() => {
    if (!outcome) return;
    const reason = (searchParams.get('reason') ?? undefined) as
      | MailboxConnectError
      | undefined;
    setResult({ ok: outcome === 'connected', reason });
    queryClient.invalidateQueries({ queryKey: MAILBOX_QUERY_KEY });
    setSearchParams(
      prev => {
        prev.delete('mailbox');
        prev.delete('reason');
        return prev;
      },
      { replace: true },
    );
  }, [outcome, searchParams, setSearchParams, queryClient]);

  const clear = useCallback(() => setResult(null), []);
  return { result, clear };
};
