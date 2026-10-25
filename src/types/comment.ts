import type { CommentEmailDto } from '@/api/local/comments';

// Re-export types from generated client
export {
  type HelpdeskApplicationCommentsDTOsCommentDto,
  type HelpdeskApplicationCommentsCommandsAddCommentAddCommentCommand,
  type HelpdeskApplicationCommentsCommandsAddInternalNoteAddInternalNoteCommand,
  HelpdeskDomainCommentsEnumsCommentType,
} from '@brainforgeau/helpdesk-client';

// Local type aliases for convenience
import type { HelpdeskApplicationCommentsDTOsCommentDto as GeneratedCommentDto } from '@brainforgeau/helpdesk-client';
import { HelpdeskDomainCommentsEnumsCommentType } from '@brainforgeau/helpdesk-client';

export type CommentDto = GeneratedCommentDto & {
  // Add any UI-specific fields
  createdByUserName?: string;
  authorId?: string | null;
  /**
   * Set when the comment went out, or came in, as email. Declared here until
   * the client is regenerated.
   */
  email?: CommentEmailDto | null;
};

export enum CommentType {
  Reply = 'Reply',
  InternalNote = 'InternalNote',
  SystemMessage = 'SystemMessage',
}

export interface CreateCommentCommand {
  ticketId: string;
  body: string;
  commentType: string;
  idempotencyKey?: string;
}
