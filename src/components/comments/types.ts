import type { CommentDto, CommentType } from '@/types/comment';

export type { CommentDto, CommentType };

export interface CommentThreadProps {
  ticketId: string;
  comments: CommentDto[];
  isLoading?: boolean;
}

export interface ReplyEditorProps {
  ticketId: string;
  onCommentAdded?: () => void;
}
