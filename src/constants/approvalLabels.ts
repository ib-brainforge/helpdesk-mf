/**
 * Centralised label maps for approval enums.
 * Import from here; do not re-define locally in pages.
 */

import { HelpdeskDomainApprovalsEnumsApprovalMode } from '@brainforgeau/helpdesk-client';

export const APPROVAL_MODE_LABELS: Record<
  HelpdeskDomainApprovalsEnumsApprovalMode,
  string
> = {
  Sequential: 'Sequential',
  Parallel: 'Parallel',
  AnyOne: 'Any one approver',
};
