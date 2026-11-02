import type {
  HelpdeskDomainKnowledgeBaseEnumsKbSharing as KbSharing,
  HelpdeskDomainKnowledgeBaseEnumsKbStaffSection as KbStaffSection,
} from '@/api/helpdesk-client';

/** Who below this tenant reads a category's published articles. */
export const SHARING_OPTIONS: ReadonlyArray<{ id: KbSharing; label: string }> =
  [
    { id: 'Internal', label: 'This tenant only' },
    { id: 'Customers', label: 'Our tenants' },
    { id: 'AllBelow', label: 'Our tenants and theirs' },
  ];

export const SHARING_HINT =
  'Tenants below see only published articles open to everyone or to signed-in users. Drafts and technician-only articles stay here.';

export const sharingLabel = (sharing: KbSharing): string =>
  SHARING_OPTIONS.find(o => o.id === sharing)?.label ?? sharing;

/** Where staff see a category's articles inside the apps. */
export const STAFF_SECTION_OPTIONS: ReadonlyArray<{
  id: KbStaffSection;
  label: string;
}> = [
  { id: 'None', label: 'Not shown' },
  { id: 'Help', label: 'Page help' },
  { id: 'WhatsNew', label: "What's new" },
];

export const STAFF_SECTION_HINT =
  "Page help shows an article on the pages it is tagged for. What's new lists it in every user's What's new.";

export const staffSectionLabel = (section: KbStaffSection): string =>
  STAFF_SECTION_OPTIONS.find(o => o.id === section)?.label ?? section;

/**
 * The badge on an article another tenant owns: "From Netcorp", or a neutral
 * word when the owner's name cannot be read. Undefined on the tenant's own
 * articles, which get no badge.
 */
export const ownerBadgeLabel = (
  article: { isInherited?: boolean; ownerTenantId?: string },
  names: Record<string, string>,
): string | undefined => {
  if (!article.isInherited) return undefined;
  const name = article.ownerTenantId ? names[article.ownerTenantId] : undefined;
  return name ? `From ${name}` : 'Shared with you';
};
