// Re-export types from generated client
export {
  type HelpdeskApplicationCannedResponsesDTOsCannedResponseDto,
  type HelpdeskApplicationCannedResponsesCommandsCreateCannedResponseCreateCannedResponseCommand,
  type HelpdeskApplicationCannedResponsesCommandsUpdateCannedResponseUpdateCannedResponseCommand,
  HelpdeskDomainCannedResponsesEnumsCannedResponseScope,
  HelpdeskDomainCannedResponsesEnumsCannedResponseScope as CannedResponseScope,
} from '@/api/helpdesk-client';

// Local type aliases for convenience
import type { HelpdeskApplicationCannedResponsesDTOsCannedResponseDto as GeneratedCannedResponseDto } from '@/api/helpdesk-client';

export type CannedResponseDto = GeneratedCannedResponseDto & {
  // Add any UI-specific fields
  categoryName?: string;
};
