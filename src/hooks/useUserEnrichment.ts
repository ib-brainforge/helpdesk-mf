import { contextQueryKeyAtom } from '@/state/context-query-key';
import { createIdentityApiClient } from '@/utils/identityApiClient';
import {
  type UserDto,
  UsersApi,
} from '@brainforgeau/identity-management-client';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';

export interface UserInfo {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

const getUserName = (user: UserDto): string => {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return fullName || user.email || 'Unknown';
};

/**
 * One empty map for every caller with nothing loaded, rather than a new `{}`
 * each render: callers put userMap in table column memos, which a fresh
 * object would rebuild on every render.
 */
const EMPTY_USER_MAP: Record<string, UserInfo | null> = Object.freeze({});

/*
 * ONE IDENTITY REQUEST FOR THE WHOLE PAGE, NOT ONE PER HOOK
 *
 * Several parts of a page look people up at once: on a ticket, the header,
 * the sidebar, the conversation and the assignee picker each asked for their
 * own set of ids, which was four bulk requests for overlapping people. Ids
 * asked for within a few milliseconds of each other are now collected and
 * sent together, and each person is remembered for five minutes, so a later
 * lookup that only adds a name or two asks only for those.
 */
const BATCH_DELAY_MS = 10;
const BATCH_MAX_IDS = 100;
const CACHE_MS = 5 * 60 * 1000;

interface Pending {
  resolve: (user: UserInfo | null) => void;
  reject: (error: unknown) => void;
}

const known = new Map<string, { at: number; user: Promise<UserInfo | null> }>();
const queued = new Map<string, Map<string, Pending>>();

const toUserInfo = (user: UserDto, id: string): UserInfo => ({
  id,
  name: getUserName(user),
  email: user.email ?? undefined,
  avatarUrl: user.avatarUrl ?? undefined,
});

const flush = async (contextKey: string) => {
  const batch = queued.get(contextKey);
  queued.delete(contextKey);
  if (!batch?.size) return;
  const ids = Array.from(batch.keys());
  try {
    const client = await createIdentityApiClient(UsersApi);
    const found = new Map<string, UserInfo>();
    for (let i = 0; i < ids.length; i += BATCH_MAX_IDS) {
      const { data } = await client.v1UsersBulkPost({
        keycloakUserIds: ids.slice(i, i + BATCH_MAX_IDS),
      });
      for (const user of (data ?? []) as UserDto[]) {
        const id = user.keycloakUserId ?? user.id;
        if (id) found.set(id, toUserInfo(user, id));
      }
    }
    // An id that does not resolve (a deleted account, imported data) is a
    // present null, so UserCell can say so.
    for (const [id, p] of batch) p.resolve(found.get(id) ?? null);
  } catch (error) {
    for (const [id, p] of batch) {
      known.delete(`${contextKey}|${id}`);
      p.reject(error);
    }
  }
};

/** One person, batched with every other lookup made at the same moment. */
const loadUser = (contextKey: string, id: string): Promise<UserInfo | null> => {
  const cacheKey = `${contextKey}|${id}`;
  const hit = known.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.user;
  const user = new Promise<UserInfo | null>((resolve, reject) => {
    let batch = queued.get(contextKey);
    if (!batch) {
      batch = new Map();
      queued.set(contextKey, batch);
      setTimeout(() => void flush(contextKey), BATCH_DELAY_MS);
    }
    batch.set(id, { resolve, reject });
  });
  known.set(cacheKey, { at: Date.now(), user });
  return user;
};

export const useUserEnrichment = (
  userIds: Array<string | undefined | null>,
) => {
  const contextKey = useAtomValue(contextQueryKeyAtom);
  const uniqueIds = useMemo(
    () =>
      Array.from(
        new Set(userIds.filter((id): id is string => Boolean(id && id.trim()))),
      ),
    [userIds],
  );

  const query = useQuery({
    queryKey: ['user-enrichment', contextKey, uniqueIds],
    enabled: uniqueIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      // Batched across every hook on the page (see loadUser above).
      const users = await Promise.all(
        uniqueIds.map(id => loadUser(contextKey, id)),
      );
      // Keyed on every id asked about, so an unresolved user is a present
      // null rather than a missing key. Callers can tell "not found" from
      // "not fetched yet".
      return Object.fromEntries(
        uniqueIds.map((id, i) => [id, users[i]]),
      ) as Record<string, UserInfo | null>;
    },
  });

  return {
    userMap: query.data ?? EMPTY_USER_MAP,
    isLoading: query.isLoading,
  };
};
