import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { HelpApi } from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const KEY = ['help'] as const;

const WHATS_NEW_PAGE_SIZE = 20;

/**
 * The backend always sends an id; the filter only narrows the generated
 * optional, so an entry can be keyed and marked read by it.
 */
const withId = <T extends { id?: string }>(
  entries: readonly T[],
): Array<T & { id: string }> =>
  entries.filter((e): e is T & { id: string } => !!e.id);

export const getPageHelp = async (pageKey: string) => {
  const client = await createHelpdeskApiClient(HelpApi);
  const { data } = await client.v1HelpPagesPageKeyGet(pageKey);
  return withId(data ?? []);
};

export const getWhatsNewUnreadCount = async () => {
  const client = await createHelpdeskApiClient(HelpApi);
  const { data } = await client.v1HelpWhatsNewUnreadCountGet();
  return data?.count ?? 0;
};

export const getWhatsNew = async () => {
  const client = await createHelpdeskApiClient(HelpApi);
  const { data } = await client.v1HelpWhatsNewGet(
    undefined,
    1,
    WHATS_NEW_PAGE_SIZE,
  );
  return withId(data?.items ?? []);
};

const markWhatsNewRead = async (id: string) => {
  const client = await createHelpdeskApiClient(HelpApi);
  await client.v1HelpWhatsNewIdReadPost(id);
};

/** Published help articles tagged with this page, from this tenant and the offices above. */
export const usePageHelp = (pageKey: string, enabled: boolean) =>
  useQuery({
    queryKey: [...KEY, 'page', pageKey],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: () => getPageHelp(pageKey),
  });

/** The user's unread What's new count, for the badge on the Help button. */
export const useWhatsNewUnreadCount = () =>
  useQuery({
    queryKey: [...KEY, 'whats-new', 'unread-count'],
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: getWhatsNewUnreadCount,
  });

export const useWhatsNew = (enabled: boolean) =>
  useQuery({
    queryKey: [...KEY, 'whats-new', 'list'],
    enabled,
    queryFn: () => getWhatsNew(),
  });

export const useMarkWhatsNewRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markWhatsNewRead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [...KEY, 'whats-new'] }),
  });
};
