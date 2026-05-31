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
      client.invalidateQueries();
    };

    window.addEventListener(CONTEXT_TOKEN_CHANGED_EVENT, handleContextChange);
    return () => {
      window.removeEventListener(
        CONTEXT_TOKEN_CHANGED_EVENT,
        handleContextChange,
      );
    };
  }, [client]);

  return (
    <HydrateAtoms>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </HydrateAtoms>
  );
}
