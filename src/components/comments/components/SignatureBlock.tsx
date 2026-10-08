import DOMPurify from 'dompurify';
import type { FC } from 'react';

/**
 * An email signature as it will appear under a reply: indented with a rule
 * on the left, as mail clients show a signature block.
 *
 * The server sanitises the signature when it is saved; it is sanitised again
 * here because it is rendered as HTML.
 */
export const SignatureBlock: FC<{ html: string; className?: string }> = ({
  html,
  className = '',
}) => (
  <div
    className={`border-l-2 border-default-200 pl-3 text-xs leading-5 text-default-600 [&_strong]:text-foreground [&_img]:inline-block [&_img]:max-h-10 ${className}`}
    // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitised with DOMPurify
    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
  />
);
