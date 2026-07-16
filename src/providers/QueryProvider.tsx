import { CONTEXT_TOKEN_CHANGED_EVENT } from '@brainforgeau/security';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { queryClientAtom } from 'jotai-tanstack-query';
import { useHydrateAtoms } from 'jotai/react/utils';
import { useEffect, useState } from 'react';

const HydrateAtoms = ({ children }: { children: React.ReactNode }) => {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  useHydrateAtoms([[queryClientAtom, client]]);

  return children;
};

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = useAtomValue(queryClientAtom);

  useEffect(() => {
    const handleContextChange = () => {
      // A context-token change means permissions/tenant/organization/division
      // may have flipped (e.g. switching apps in the single-app shell re-mints
      // the shared context token on every switch), so correctness requires
      // marking EVERY cached query stale - we cannot narrow the match filter
      // itself. But eagerly refetching queries nobody is currently observing
      // wastes network/CPU on every app switch, so scope the *refetch* (not
      // the invalidation) to only actively-mounted/observed queries via
      // `refetchType: 'active'`. Inactive/cached queries are still marked
      // stale and will refetch correctly the next time they're observed.
      //
      // Note: @tanstack/react-query v5's default `refetchType` already
      // resolves to 'active' when unset (see query-core's
      // `queryClient.js` invalidateQueries: `filters?.refetchType ??
      // filters?.type ?? 'active'`), so this does not change today's runtime
      // behavior - it makes the intended scope explicit and pins it against
      // a future default change in the library.
      client.invalidateQueries({ refetchType: 'active' });
    };

    window.addEventListener(CONTEXT_TOKEN_CHANGED_EVENT, handleContextChange);
    return () => {
      window.removeEventListener(
        CONTEXT_TOKEN_CHANGED_EVENT,
        handleContextChange,
      );
    };
  }, [client]);

  useEffect(() => {
    // The QueryClient itself is retained beyond this component's lifetime in
    // the module-level `queryClientAtom` (first-write-wins via
    // `useHydrateAtoms`), so it survives this provider unmounting while other
    // remotes are active in the shell - otherwise its cache pins heap for the
    // rest of the shell session. Free it immediately when this app's root
    // unmounts (embedded: the bridge destroys/unmounts this remote's root
    // when navigating away; standalone: the page/app is closing anyway, so
    // clearing here is harmless). A fresh QueryClient is not created here -
    // the atom keeps the same instance, we just drop its cached data.
    return () => {
      client.clear();
    };
  }, [client]);

  return (
    <HydrateAtoms>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </HydrateAtoms>
  );
}
