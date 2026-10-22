import { AttachmentsApi } from '@/api/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { useEffect, useState } from 'react';

/**
 * Fetch an attachment through the authenticated client and hand back a blob URL
 * usable as an `<img src>`.
 *
 * WHY THIS IS NEEDED AT ALL
 * The attachment list builds `url` as `${baseUrl}/v1/attachments/${id}` and the
 * tile put that straight into `<img src>`. A browser never attaches the
 * Authorization header to an image request, and that endpoint requires auth, so
 * every image thumbnail came back 401 and rendered as a broken-image icon. PDFs
 * and spreadsheets looked fine only because they draw a static icon and never
 * fetch anything.
 *
 * Going through the API client instead means the request carries the bearer and
 * the context token like any other call, and it follows the endpoint's redirect
 * to the presigned URL on the way. The response is turned into an object URL,
 * which is same-origin and needs no credentials of its own.
 *
 * NOT USED: `/v1/attachments/download/{storageKey}`, which streams the file
 * with no auth attribute at all. It would have worked in one line, and that is
 * the problem: it would make every thumbnail depend on an endpoint that serves
 * any attachment to anyone holding a storage key.
 *
 * The object URL is revoked when the component unmounts or the id changes.
 * Without that each ticket view would leak the full decoded image for the life
 * of the tab.
 */
export const useAttachmentBlobUrl = (
  attachmentId: string | undefined,
  enabled: boolean,
): { url?: string; isLoading: boolean; hasFailed: boolean } => {
  const [url, setUrl] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    if (!attachmentId || !enabled) return undefined;

    // Guards against a slow response for a previous id overwriting a newer one,
    // and against setting state after unmount.
    let cancelled = false;
    let objectUrl: string | undefined;

    setIsLoading(true);
    setHasFailed(false);

    (async () => {
      try {
        const client = await createHelpdeskApiClient(AttachmentsApi);
        const response = await client.v1AttachmentsIdGet(attachmentId, {
          responseType: 'blob',
        });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(response.data as unknown as Blob);
        setUrl(objectUrl);
      } catch {
        // A deleted file, an expired presigned URL or a storage outage. The
        // tile falls back to the file-type icon rather than a broken image.
        if (!cancelled) setHasFailed(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentId, enabled]);

  return { url, isLoading, hasFailed };
};
