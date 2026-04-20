/**
 * Centralised label maps for category enums.
 * Import from here; do not re-define locally in pages.
 */

import { HelpdeskDomainCategoriesEnumsAccessLevel } from '@brainforgeau/helpdesk-client';

export const ACCESS_LEVEL_LABELS: Record<
  HelpdeskDomainCategoriesEnumsAccessLevel,
  string
> = {
  Everyone: 'Everyone',
  AgentsOnly: 'Agents only',
  AdminsOnly: 'Admins only',
};
