import { getSignatureImageBlob } from '@/api/local/signature-images';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

const key = (id: string) => ['signature-image', id] as const;

/**
 * Object URLs for signature images, by id. The route needs authorisation, so
 * an <img> cannot load it directly; each image is fetched once as a blob and
 * kept for the session (an image never changes under its id).
 */
export const useSignatureImageUrls = (
  ids: string[],
): Record<string, string | undefined> => {
  const results = useQueries({
    queries: ids.map(id => ({
      queryKey: key(id),
      queryFn: async () => URL.createObjectURL(await getSignatureImageBlob(id)),
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: Number.POSITIVE_INFINITY,
      retry: false,
    })),
  });
  return Object.fromEntries(ids.map((id, i) => [id, results[i]?.data]));
};

/**
 * Seeds the cache with a just-uploaded file, so the editor shows it at once
 * without fetching back the bytes it already has.
 */
export const useSeedSignatureImage = () => {
  const queryClient = useQueryClient();
  return useCallback(
    (id: string, file: Blob) =>
      queryClient.setQueryData(key(id), URL.createObjectURL(file)),
    [queryClient],
  );
};
