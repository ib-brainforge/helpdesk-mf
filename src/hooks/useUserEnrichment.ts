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
      const client = await createIdentityApiClient(UsersApi);

      /*
       * One request for the whole page, not one per user.
       *
       * This used to fan out `uniqueIds.map(id => v1UsersIdGet(id))`, so a
       * grid of 25 tickets fired roughly 40 identity requests on every load,
       * one per distinct requester and assignee. `v1UsersBulkPost` takes the
       * ids together and returns the matching users in a single round trip.
       *
       * Ids that do not resolve are simply absent from the response rather
       * than being an error, which is the normal case for a deleted account or
       * imported data. They are mapped to null below so UserCell can say so.
       */
      const { data } = await client.v1UsersBulkPost({
        keycloakUserIds: uniqueIds,
      });

      const byId = new Map<string, UserInfo>();
      for (const user of (data ?? []) as UserDto[]) {
        const id = user.keycloakUserId ?? user.id;
        if (!id) continue;
        byId.set(id, {
          id,
          name: getUserName(user),
          email: user.email ?? undefined,
          avatarUrl: user.avatarUrl ?? undefined,
        });
      }

      // Keyed on every id we asked about, so an unresolved user is a present
      // null rather than a missing key. Callers can tell "not found" from
      // "not fetched yet".
      return Object.fromEntries(
        uniqueIds.map(id => [id, byId.get(id) ?? null]),
      ) as Record<string, UserInfo | null>;
    },
  });

  return {
    userMap: query.data ?? {},
    isLoading: query.isLoading,
  };
};
