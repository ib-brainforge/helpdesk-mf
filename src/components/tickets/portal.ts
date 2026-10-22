import type { HelpdeskApplicationTicketsDTOsTicketLinkedEntityDto as LinkedEntity } from '@/api/helpdesk-client';

export const PORTAL_ORIGIN = 'Portal';
export const CONSIGNMENT_ENTITY_TYPE = 'freight.consignment';

export const isPortalTicket = (origin: string | undefined | null): boolean =>
  origin === PORTAL_ORIGIN;

/** The consignment a portal enquiry is about: the earliest one linked. */
export const findConsignmentLink = (
  linkedEntities: readonly LinkedEntity[] | undefined | null,
): LinkedEntity | undefined =>
  (linkedEntities ?? [])
    .filter(l => l.entityType === CONSIGNMENT_ENTITY_TYPE)
    .sort((a, b) => (a.linkedAt ?? '').localeCompare(b.linkedAt ?? ''))[0];

export const linkedEntityTypeLabel = (
  entityType: string | undefined,
): string =>
  entityType === CONSIGNMENT_ENTITY_TYPE
    ? 'Consignment'
    : (entityType ?? 'Record');

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
};

/**
 * Customer-authored text is stored HTML-encoded plain text. This turns the
 * entities back into characters without ever parsing markup, so the result is
 * only meant to be rendered as a text node.
 */
export const decodePlainText = (encoded: string): string =>
  encoded.replace(
    /&(?:amp|lt|gt|quot|#39|#x27);/g,
    entity => ENTITIES[entity] ?? entity,
  );
