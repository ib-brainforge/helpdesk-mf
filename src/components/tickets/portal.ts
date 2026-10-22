import type { HelpdeskApplicationTicketsDTOsTicketLinkedEntityDto as LinkedEntity } from '@/api/helpdesk-client';

export const PORTAL_ORIGIN = 'Portal';
export const CONSIGNMENT_ENTITY_TYPE = 'freight.consignment';

export const isPortalTicket = (origin: string | undefined | null): boolean =>
  origin === PORTAL_ORIGIN;

const linkedTime = (l: LinkedEntity): number =>
  l.linkedAt ? new Date(l.linkedAt).getTime() : Number.POSITIVE_INFINITY;

/** The consignment a portal enquiry is about: the earliest one linked. */
export const findConsignmentLink = (
  linkedEntities: readonly LinkedEntity[] | undefined | null,
): LinkedEntity | undefined =>
  (linkedEntities ?? [])
    .filter(l => l.entityType === CONSIGNMENT_ENTITY_TYPE)
    .sort((a, b) => linkedTime(a) - linkedTime(b))[0];

export const linkedEntityTypeLabel = (
  entityType: string | undefined,
): string =>
  entityType === CONSIGNMENT_ENTITY_TYPE
    ? 'Consignment'
    : (entityType ?? 'Record');

/**
 * Customer-authored text is stored HTML-encoded plain text (named and numeric
 * entities). A literal `<` is escaped before parsing so a stray tag stays
 * visible text, and DOMParser builds an inert document: no script runs and no
 * resource is requested. The result is only ever rendered as a React text node.
 */
export const decodePlainText = (encoded: string | null | undefined): string => {
  if (!encoded) return '';
  const inert = new DOMParser().parseFromString(
    `<!doctype html><body>${encoded.replace(/</g, '&lt;')}`,
    'text/html',
  );
  return inert.body.textContent ?? '';
};
