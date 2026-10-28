import { formatDate } from '@brainforgeau/components/utils';
import {
  type Answers,
  type CategorySpec,
  type FieldSpec,
  isAnswered,
} from './request-field-schema';

/**
 * Folds the wizard's answers into the ticket description, as HTML.
 *
 * HTML rather than markdown: nothing renders markdown. The ticket view shows a
 * description either as sanitised HTML or as literal pre-wrapped text, so a
 * markdown block arrived on screen with its own asterisks and hyphens showing,
 * which is worse than plain prose would have been. The rich text editor on the
 * ticket already produces HTML, so this matches what the field holds anyway.
 *
 * WHY THE DESCRIPTION AND NOT STRUCTURED FIELDS
 * Structured storage needs a CustomFieldDefinitionId per answer, which only
 * exists for questions defined in the database. These questions are defined in
 * code, so there is nowhere structured to put them. The description is the one
 * field that accepts arbitrary text and is shown to whoever picks the ticket up.
 *
 * What that costs, stated plainly so nobody discovers it later: these answers
 * cannot be filtered, grouped or reported on. "Show me every Critical GPS fault
 * on one vehicle" is not answerable from this data. If that becomes a
 * requirement, the questions move into CustomFieldDefinition rows and the
 * answers into CustomFieldValue, and this function goes away.
 *
 * The free-text description the user typed is kept FIRST and unlabelled, so a
 * ticket still reads like a ticket, with the questionnaire beneath it as
 * supporting detail rather than burying the actual problem.
 */

const DETAILS_KEY = 'details';

const renderValue = (spec: FieldSpec, value: unknown): string => {
  if (
    (spec.kind === 'checklist' || spec.kind === 'asset') &&
    Array.isArray(value)
  ) {
    return value.join(', ');
  }
  // Dates as DD/MM/YYYY, the way Netcorp reads them, not the picker's ISO value.
  if (spec.kind === 'date')
    return formatDate(String(value ?? ''), { emptyLabel: '' });
  return String(value ?? '').trim();
};

export interface FormatArgs {
  category: CategorySpec;
  answers: Answers;
  /** Contact details captured on the details step. Omitted lines are dropped. */
  contact?: {
    company?: string;
    location?: string;
    name?: string;
    phone?: string;
    email?: string;
  };
}

/**
 * Escapes a value so it displays literally.
 *
 * The answers are free text from the requester. Without this, a subject
 * containing "<b>" or "&" would either render as markup or arrive mangled.
 * DOMPurify strips anything dangerous at render time, but that is a safety net,
 * not a reason to hand it markup the user did not write.
 */
const esc = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Free text keeps its line breaks, which are otherwise collapsed in HTML. */
const asParagraphs = (text: string): string =>
  text
    .split(/\n{2,}/)
    .map(block => `<p>${esc(block).replace(/\n/g, '<br>')}</p>`)
    .join('');

const definitionList = (
  heading: string,
  rows: Array<[string, string]>,
): string =>
  `<p><strong>${heading}</strong></p><ul>${rows
    .map(
      ([label, value]) =>
        `<li><strong>${esc(label)}:</strong> ${esc(value)}</li>`,
    )
    .join('')}</ul>`;

export const buildDescription = ({
  category,
  answers,
  contact,
}: FormatArgs): string => {
  const sections: string[] = [];

  // The user's own words lead. Everything else is context for them.
  const freeText = String(answers[DETAILS_KEY] ?? '').trim();
  if (freeText) sections.push(asParagraphs(freeText));

  const answered = category.fields.filter(
    f => f.key !== DETAILS_KEY && isAnswered(f, answers[f.key]),
  );

  if (answered.length > 0) {
    sections.push(
      definitionList(
        'Request details',
        answered.map(f => [f.label, renderValue(f, answers[f.key])]),
      ),
    );
  }

  // Ordered person first, then how to reach them, then where: the order someone
  // reads it in when they pick the ticket up.
  const contactRows = (
    [
      ['Contact', contact?.name],
      ['Phone', contact?.phone],
      ['Email', contact?.email],
      ['Company', contact?.company],
      ['Location', contact?.location],
    ] as Array<[string, string | undefined]>
  ).filter((r): r is [string, string] => !!r[1]);

  if (contactRows.length > 0) {
    sections.push(definitionList('Contact', contactRows));
  }

  return sections.join('');
};

/**
 * Maps the questionnaire's urgency onto the ticket priority.
 *
 * The wizard asks "Urgency" because that is the word the requester understands,
 * while the ticket stores Priority. Keeping them as one value would make the
 * form speak the helpdesk's language instead of the tenant's; mapping keeps
 * both. Anything unrecognised falls to Normal rather than guessing upward,
 * since an inflated priority is a real cost to whoever triages the queue.
 */
export const urgencyToPriority = (urgency: unknown): string => {
  switch (String(urgency ?? '').trim()) {
    case 'Critical':
      return 'Critical';
    case 'High':
      return 'High';
    case 'Low':
      return 'Low';
    default:
      return 'Normal';
  }
};
