/**
 * Ticket links, and the gap between what a person picks and what the API stores.
 *
 * THE API STORES A DIRECTED EDGE
 * A link is (source, target, type). The backend has three types: Related,
 * Duplicate and BlockedBy. It has no "Blocks", because "A blocks B" and "B is
 * blocked by A" are the same edge read from opposite ends.
 *
 * A PERSON PICKS A PHRASE
 * From the ticket in front of them the useful choices are "blocks" and "is
 * blocked by", which are different statements about THIS ticket. Turning one
 * into the other is a matter of which end of the edge this ticket sits on, so
 * the picker offers five phrases and this maps them onto three types plus a
 * direction.
 *
 * WHAT WAS THERE BEFORE
 * The picker sent its own strings ("relates-to", "is-blocked-by") straight to an
 * endpoint typed as the enum, cast through `as any` with a REVIEW comment noting
 * the backend "should accept string linkType". It never did: the wire format is
 * the enum NAMES. Nothing caught it because no screen could reach the picker.
 */

/** Wire values, matching the backend enum names exactly. */
export type TicketLinkTypeWire = 'Related' | 'Duplicate' | 'BlockedBy';

/** What the picker offers, phrased from the current ticket's point of view. */
export type TicketLinkSemantic =
  | 'relates-to'
  | 'blocks'
  | 'is-blocked-by'
  | 'duplicates'
  | 'is-duplicated-by';

export const TICKET_LINK_OPTIONS: {
  value: TicketLinkSemantic;
  label: string;
}[] = [
  { value: 'relates-to', label: 'Relates to' },
  { value: 'blocks', label: 'Blocks' },
  { value: 'is-blocked-by', label: 'Is blocked by' },
  { value: 'duplicates', label: 'Duplicates' },
  { value: 'is-duplicated-by', label: 'Is duplicated by' },
];

/**
 * `swap` means the current ticket is the TARGET of the stored edge, so the two
 * ids go out reversed.
 */
const SEMANTIC_TO_WIRE: Record<
  TicketLinkSemantic,
  { linkType: TicketLinkTypeWire; swap: boolean }
> = {
  'relates-to': { linkType: 'Related', swap: false },
  duplicates: { linkType: 'Duplicate', swap: false },
  'is-duplicated-by': { linkType: 'Duplicate', swap: true },
  'is-blocked-by': { linkType: 'BlockedBy', swap: false },
  blocks: { linkType: 'BlockedBy', swap: true },
};

/** The (source, target, type) triple to POST for a phrase the user picked. */
export const toWireLink = (
  semantic: TicketLinkSemantic,
  currentTicketId: string,
  otherTicketId: string,
) => {
  const { linkType, swap } = SEMANTIC_TO_WIRE[semantic] ?? {
    linkType: 'Related' as const,
    swap: false,
  };
  return {
    sourceTicketId: swap ? otherTicketId : currentTicketId,
    targetTicketId: swap ? currentTicketId : otherTicketId,
    linkType,
  };
};

export interface TicketLink {
  id?: string;
  sourceTicketId?: string;
  targetTicketId?: string;
  sourceTicketSubject?: string;
  targetTicketSubject?: string;
  linkType?: string;
}

/**
 * How a stored edge reads from the ticket currently on screen: the phrase, and
 * which ticket is the OTHER end.
 *
 * Without this every link on a ticket would read "Related" regardless of
 * direction, and a blocking link would say the same thing on both tickets while
 * meaning opposite things.
 */
export const describeLink = (link: TicketLink, currentTicketId: string) => {
  const isSource = link.sourceTicketId === currentTicketId;
  const otherTicketId = isSource ? link.targetTicketId : link.sourceTicketId;
  const otherSubject = isSource
    ? link.targetTicketSubject
    : link.sourceTicketSubject;

  let label: string;
  switch (link.linkType) {
    case 'Duplicate':
      label = isSource ? 'Duplicates' : 'Is duplicated by';
      break;
    case 'BlockedBy':
      label = isSource ? 'Is blocked by' : 'Blocks';
      break;
    default:
      label = 'Relates to';
  }

  return { label, otherTicketId, otherSubject };
};
