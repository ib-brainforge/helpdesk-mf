import { SIGNATURE_IMAGE_SCHEME } from '@/api/local/signature-images';
import DOMPurify from 'dompurify';
import { type FC, useMemo } from 'react';
import { useSignatureImageUrls } from '../signature/useSignatureImageUrl';

/** An uploaded image's canonical src; the id is captured. */
const IMAGE_SRC = new RegExp(`${SIGNATURE_IMAGE_SCHEME}([0-9a-f-]{36})`, 'gi');

/**
 * DOMPurify's default URI check plus the two schemes a signature image uses:
 * its canonical src, swapped below for the blob URL it is shown through.
 */
const ALLOWED_URI =
  /^(?:(?:https?|mailto|tel|cid|blob|helpdesk-signature-image):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

/**
 * An email signature as it will appear under a reply: indented with a rule
 * on the left, as mail clients show a signature block.
 *
 * The server sanitises the signature when it is saved; it is sanitised again
 * here because it is rendered as HTML. Uploaded images are stored by id and
 * served by an authenticated route, so they are shown through object URLs,
 * at the width saved with them.
 */
export const SignatureBlock: FC<{ html: string; className?: string }> = ({
  html,
  className = '',
}) => {
  const ids = useMemo(
    () => Array.from(new Set(Array.from(html.matchAll(IMAGE_SRC), m => m[1]))),
    [html],
  );
  const urls = useSignatureImageUrls(ids);
  const rendered = DOMPurify.sanitize(html, {
    ALLOWED_URI_REGEXP: ALLOWED_URI,
  }).replace(IMAGE_SRC, (_, id: string) => urls[id] ?? '');
  return (
    <div
      className={`border-l-2 border-default-200 pl-3 text-xs leading-5 text-default-600 [&_strong]:text-foreground [&_img]:inline-block [&_img]:h-auto [&_img]:max-w-full ${className}`}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitised with DOMPurify
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
};
