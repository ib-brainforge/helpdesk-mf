import { StatusBadge } from '@/components/shared';
import { type CommentDto, CommentType } from '@/types/comment';
import { fromApiCommentType } from '@/utils/typeMappers';
import { EmptyState } from '@brainforgeau/components/page';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import DOMPurify from 'dompurify';

interface CommentThreadProps {
  comments: CommentDto[];
  isLoading?: boolean;
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
}) => {
  const timezone = useTimezone();
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
                  {comment.createdByUserName ||
                    comment.authorId ||
                    'Unknown User'}
                </span>
                <StatusBadge color={getCommentTypeColor(commentType)}>
                  {getCommentTypeName(commentType)}
                </StatusBadge>
              </div>
              <span className="text-default-400 text-xs">
                {formatDateTime(comment.createdAt, { timezone })}
              </span>
            </div>
            <div
              className={`text-sm ${getCommentTextClass(commentType)}`}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(comment.body ?? ''),
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
