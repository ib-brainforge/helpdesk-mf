// Re-export types from generated client
export {
  type HelpdeskApplicationCannedResponsesDTOsCannedResponseDto,
  type HelpdeskApplicationCannedResponsesCommandsCreateCannedResponseCreateCannedResponseCommand,
  type HelpdeskApplicationCannedResponsesCommandsUpdateCannedResponseUpdateCannedResponseCommand,
  HelpdeskDomainCannedResponsesEnumsCannedResponseScope,
} from '@brainforgeau/helpdesk-client';

// Local type aliases for convenience
import type { HelpdeskApplicationCannedResponsesDTOsCannedResponseDto as GeneratedCannedResponseDto } from '@brainforgeau/helpdesk-client';

export type CannedResponseDto = GeneratedCannedResponseDto & {
  // Add any UI-specific fields
  categoryName?: string;
};

export enum CannedResponseScope {
  Personal = 'Personal',
  Team = 'Team',
  Global = 'Global',
}

export interface CreateCannedResponseCommand {
  title: string;
  body: string;
  scope: number;
  categoryId?: string;
}

export interface UpdateCannedResponseCommand {
  title: string;
  body: string;
  scope: number;
  categoryId?: string;
}
