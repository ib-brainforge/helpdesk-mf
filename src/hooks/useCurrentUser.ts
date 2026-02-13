import { useAtomValue } from 'jotai';
import { authUserAtom } from '@/state/auth-atoms';

export const useCurrentUser = () => {
  const user = useAtomValue(authUserAtom);

  const currentUser = user?.profile
    ? {
        id: user.profile.sub,
        name: (user.profile.name ?? user.profile.preferred_username ?? user.profile.email ?? 'Unknown') as string,
        email: user.profile.email,
      }
    : undefined;

  return { currentUser, isLoading: false, error: null };
};
