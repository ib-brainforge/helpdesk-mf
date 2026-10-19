import { useBindQueryClientToContext } from '@brainforgeau/security/query';
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

  useBindQueryClientToContext(client);

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
