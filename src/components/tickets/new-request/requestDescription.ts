/**
 * The ticket description a request is filed with: the requester's own words,
 * then who to contact and where.
 *
 * The answers to the category's questions are not in it: they are saved as the
 * ticket's custom field values. The contact block stays, because the phone and
 * site location asked on the Details step have no field of their own on a
 * ticket, and the agent who picks it up needs them.
 */

export interface RequestContactDetails {
  name?: string;
  phone?: string;
  email?: string;
  location?: string;
}

const esc = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Plain text as paragraphs: blank lines split them, single newlines break lines. */
const asParagraphs = (text: string): string =>
  text
    .split(/\n{2,}/)
    .map(block => `<p>${esc(block).replace(/\n/g, '<br>')}</p>`)
    .join('');

export const requestDescription = (
  text: string,
  contact: RequestContactDetails,
): string => {
  const sections: string[] = [];

  // The user's own words lead. Everything else is context for them.
  const freeText = text.trim();
  if (freeText) sections.push(asParagraphs(freeText));

  // Ordered person first, then how to reach them, then where: the order someone
  // reads it in when they pick the ticket up.
  const rows = (
    [
      ['Contact', contact.name],
      ['Phone', contact.phone],
      ['Email', contact.email],
      ['Location', contact.location],
    ] as Array<[string, string | undefined]>
  )
    .map(([label, value]) => [label, value?.trim()] as const)
    .filter((r): r is readonly [string, string] => !!r[1]);

  if (rows.length > 0) {
    sections.push(
      `<p><strong>Contact</strong></p><ul>${rows
        .map(
          ([label, value]) =>
            `<li><strong>${esc(label)}:</strong> ${esc(value)}</li>`,
        )
        .join('')}</ul>`,
    );
  }

  return sections.join('');
};
