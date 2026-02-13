import { useQuery } from '@tanstack/react-query';
import { UsersApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { HelpdeskUserDto } from '@/types/user';

export const useCurrentUser = () => {
  const { data, isLoading, error } = useQuery<HelpdeskUserDto>({
    queryKey: ['current-helpdesk-user'],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(UsersApi);
      const response = await client.v1UsersMeGet();
      // REVIEW: Type conversion between generated client types and frontend types
      return response.data as unknown as HelpdeskUserDto;
    },
  });

  return { currentUser: data, isLoading, error };
};
