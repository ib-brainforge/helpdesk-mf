import { useMemo } from 'react';
import { UsersApi, type UserDto } from '@brainforgeau/identity-management-client';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { contextQueryKeyAtom } from '@/state/context-query-key';
import { createIdentityApiClient } from '@/utils/identityApiClient';

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

export const useUserEnrichment = (userIds: Array<string | undefined | null>) => {
  const contextKey = useAtomValue(contextQueryKeyAtom);
  const uniqueIds = useMemo(
    () =>
      Array.from(
        new Set(userIds.filter((id): id is string => Boolean(id && id.trim())))
      ),
    [userIds]
  );

  const query = useQuery({
    queryKey: ['user-enrichment', contextKey, uniqueIds],
    enabled: uniqueIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      const client = await createIdentityApiClient(UsersApi);

      // Fetch users one by one (like useAssetEnrichment)
      const results = await Promise.all(
        uniqueIds.map(async (id) => {
          try {
            const { data } = await client.v1UsersIdGet(id);
            const user = data as UserDto | null;
            if (user) {
              const userInfo: UserInfo = {
                id: user.keycloakUserId ?? id,
                name: getUserName(user),
                email: user.email ?? undefined,
                avatarUrl: user.avatarUrl ?? undefined,
              };
              return [id, userInfo] as const;
            }
            return [id, null] as const;
          } catch (error) {
            console.warn('Failed to fetch user detail', id, error);
            return [id, null] as const;
          }
        })
      );

      return Object.fromEntries(results) as Record<string, UserInfo | null>;
    },
  });

  return {
    userMap: query.data ?? {},
    isLoading: query.isLoading,
  };
};
