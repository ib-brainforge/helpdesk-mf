import { UsersApi, type UserDto } from '@brainforgeau/identity-management-client';
import { atomWithMutation } from 'jotai-tanstack-query';
import { createIdentityApiClient } from '@/utils/identityApiClient';

export interface UserOption {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

const getUserName = (user: UserDto): string => {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return fullName || user.email || 'Unnamed';
};

export const usersMutationAtom = atomWithMutation<UserDto[], { query: string }>(() => ({
  mutationKey: ['users-search'],
  mutationFn: async ({ query }: { query: string }) => {
    const client = await createIdentityApiClient(UsersApi);
    const response = await client.v1UsersGet(
      true, // isActive
      query, // search
    );
    return response.data.items ?? [];
  },
}));

export const mapUserToOption = (user: UserDto): UserOption => ({
  // Use keycloakUserId as the unique identifier since id is often empty/duplicate
  id: user.keycloakUserId ?? user.id ?? '',
  name: getUserName(user),
  email: user.email ?? undefined,
  avatarUrl: user.avatarUrl ?? undefined,
});
