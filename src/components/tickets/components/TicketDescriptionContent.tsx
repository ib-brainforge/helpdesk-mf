import DOMPurify from 'dompurify';
import type { FC } from 'react';
import { decodePlainText } from '../portal';

/**
 * Does this string carry markup, or is it plain text that merely contains
 * angle brackets?
 *
 * Descriptions predating the rich-text editor are plain text with real
 * newlines, and there are thousands of them. Rendering those as HTML would
 * collapse every line break; rendering genuine HTML as text would show the
 * tags. The two cases have to be told apart at display time.
 *
 * The test looks for a tag with a known-ish shape rather than any `<`, so a
 * description reading "if x < y then" is treated as the plain text it is.
 */
export const looksLikeHtml = (value: string): boolean =>
  /<\/?[a-z][a-z0-9]*(\s[^<>]*)?>/i.test(value);

/**
 * A ticket description as the ticket page shows it.
 *
 * Shared by the ticket page and the request wizard's Review step, so the
 * preview a requester checks before pressing Create is drawn by the same code
 * as the ticket they will then open, rather than a second rendering that could
 * drift from it.
 *
 * `prose` is inert: @tailwindcss/typography is not installed, so it styles
 * nothing, and Tailwind's preflight has already stripped the margins off <p>
 * and the bullets off <ul>. A structured description (the kind the request
 * wizard writes) therefore rendered as one unbroken block of bold and plain
 * text.
 *
 * The child selectors on that container restore just enough rhythm to read:
 * spacing between blocks, real bullets, an indent. Scoped there so they cannot
 * leak into the rest of the app.
 */
export const TicketDescriptionContent: FC<{
  value: string;
  className?: string;
  /** Customer-authored text: shown as text only, never interpreted as HTML. */
  isPlainText?: boolean;
}> = ({ value, className = '', isPlainText = false }) =>
  isPlainText ? (
    <p className={`whitespace-pre-wrap text-sm ${className}`}>
      {decodePlainText(value)}
    </p>
  ) : (
    <div
      className={`prose max-w-none [&_li]:my-0.5 [&_p]:my-2 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 ${className}`}
    >
      {looksLikeHtml(value) ? (
        <div
          // biome-ignore lint/security/noDangerouslySetInnerHtml: the value is passed through DOMPurify.sanitize on this same line. Ticket descriptions are untrusted (any requester, or an inbound email, controls the string) and the backend sanitiser is currently wired to knowledge-base articles only, so this is the gate.
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }}
        />
      ) : (
        <p className="whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
