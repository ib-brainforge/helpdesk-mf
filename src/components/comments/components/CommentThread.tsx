import { StatusBadge } from '@/components/shared';
import { decodePlainText } from '@/components/tickets/portal';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import { type CommentDto, CommentType } from '@/types/comment';
import { fromApiCommentType } from '@/utils/typeMappers';
import { EmptyState } from '@brainforgeau/components/page';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import DOMPurify from 'dompurify';

interface CommentThreadProps {
  comments: CommentDto[];
  isLoading?: boolean;
  /**
   * Replies by this author are customer-authored plain text (portal tickets):
   * shown as text only, never interpreted as HTML.
   */
  plainTextAuthorId?: string;
}

const getCommentTypeColor = (type: CommentType) => {
  const colors: Record<CommentType, 'default' | 'warning' | 'primary'> = {
    [CommentType.Reply]: 'default',
    [CommentType.InternalNote]: 'warning',
    [CommentType.SystemMessage]: 'primary',
  };
  return colors[type] || 'default';
};

const getCommentTypeName = (type: CommentType): string => {
  const names: Record<CommentType, string> = {
    [CommentType.Reply]: 'Reply',
    [CommentType.InternalNote]: 'Internal',
    [CommentType.SystemMessage]: 'System',
  };
  return names[type] || 'Unknown';
};

const getCommentBackgroundClass = (type: CommentType): string => {
  if (type === CommentType.InternalNote) {
    return 'bg-warning-50 dark:bg-warning-100/10 border-warning-200 dark:border-warning-800';
  }
  if (type === CommentType.SystemMessage) {
    return 'bg-default-100 dark:bg-default-50/10 border-light dark:border-default-700';
  }
  return 'bg-content1 border-divider';
};

const getCommentTextClass = (type: CommentType): string => {
  if (type === CommentType.SystemMessage) {
    return 'italic text-default-500';
  }
  return 'text-foreground';
};

export const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  isLoading,
  plainTextAuthorId,
}) => {
  const timezone = useTimezone();

  /*
   * Author names.
   *
   * The DTO carries `createdByUserName`, but nothing populates it for a comment
   * written through the API or by a background job, and the fallback was
   * `authorId`, so those rows printed a raw GUID where a person's name belongs.
   * This is the same identity lookup the grid and the ticket sidebar already
   * use, reading the same cache, so it costs no extra request for ids they have
   * already resolved.
   *
   * Declared before the isLoading early-return: a hook after it would be called
   * on some renders and not others.
   */
  const { userMap } = useUserEnrichment(comments.map(c => c.authorId));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-default-500">Loading comments...</div>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <EmptyState
        title="No comments yet"
        description="Be the first to add a comment."
        size="sm"
        live
      />
    );
  }

  return (
    <div className="space-y-4">
      {comments.map(comment => {
        const commentType =
          fromApiCommentType(comment.commentType) ?? CommentType.Reply;
        return (
          <div
            key={comment.id}
            className={`rounded-lg border p-4 ${getCommentBackgroundClass(commentType)}`}
          >
            <div className="mb-2 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {comment.createdByUserName?.trim() ||
                    (comment.authorId
                      ? userMap[comment.authorId]?.name
                      : undefined) ||
                    'Unknown user'}
                </span>
                <StatusBadge color={getCommentTypeColor(commentType)}>
                  {getCommentTypeName(commentType)}
                </StatusBadge>
              </div>
              <span className="text-default-400 text-xs">
                {formatDateTime(comment.createdAt, { timezone })}
              </span>
            </div>
            {plainTextAuthorId &&
            comment.authorId === plainTextAuthorId &&
            commentType === CommentType.Reply ? (
              <p
                className={`whitespace-pre-wrap text-sm ${getCommentTextClass(commentType)}`}
              >
                {decodePlainText(comment.body ?? '')}
              </p>
            ) : (
              <div
                className={`text-sm ${getCommentTextClass(commentType)}`}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(comment.body ?? ''),
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
