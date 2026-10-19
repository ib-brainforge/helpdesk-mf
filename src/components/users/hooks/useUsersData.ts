import { contextQueryKeyAtom } from '@/state/context-query-key';
import { createIdentityApiClient } from '@/utils/identityApiClient';
import {
  type UserDto,
  UsersApi,
} from '@brainforgeau/identity-management-client';
import { useQuery } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import { useAtomValue } from 'jotai';
import { useCallback, useState } from 'react';

export interface IdentityUserItem {
  id: string;
  name: string;
  email?: string;
}

const getUserName = (user: UserDto): string => {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return fullName || user.email || 'Unknown';
};

export const useUsersData = () => {
  const contextKey = useAtomValue(contextQueryKeyAtom);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      'identity-users',
      contextKey,
      pagination.pageIndex + 1,
      pagination.pageSize,
    ],
    queryFn: async () => {
      const client = await createIdentityApiClient(UsersApi);
      const { data } = await client.v1UsersGet(
        undefined, // tenantId
        true, // isActive
        undefined, // search
        false, // includeServiceAccounts
        false, // includeUsersWithoutMembership
        pagination.pageIndex + 1,
        pagination.pageSize,
      );
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const items: IdentityUserItem[] = (data?.items ?? []).map(
    (user: UserDto) => ({
      id: user.keycloakUserId ?? user.id ?? '',
      name: getUserName(user),
      email: user.email ?? undefined,
    }),
  );

  const totalCount = data?.totalCount ?? 0;

  return {
    items,
    totalCount,
    pagination,
    setPagination,
    isLoading,
    refetch: useCallback(() => {
      refetch();
    }, [refetch]),
  };
};
