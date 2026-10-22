import type { HelpdeskDomainKnowledgeBaseEnumsKbPortalSection as KbPortalSection } from '@/api/helpdesk-client';

export const PORTAL_SECTION_OPTIONS: ReadonlyArray<{
  id: KbPortalSection;
  label: string;
}> = [
  { id: 'None', label: 'Not shown' },
  { id: 'Help', label: 'Help' },
  { id: 'Announcements', label: 'Announcements' },
];

export const PORTAL_SECTION_HINT =
  'Choose where customers see this category in the customer portal. Only published articles are shown.';

export const portalSectionLabel = (section: KbPortalSection): string =>
  PORTAL_SECTION_OPTIONS.find(o => o.id === section)?.label ?? section;
