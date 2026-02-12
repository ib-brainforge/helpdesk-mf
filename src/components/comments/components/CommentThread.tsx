import { CommentType, type CommentDto } from '@/types/comment';
import { Chip } from '@heroui/react';

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
    return 'bg-default-100 dark:bg-default-50/10 border-default-200 dark:border-default-700';
  }
  return 'bg-content1 border-divider';
};

const getCommentTextClass = (type: CommentType): string => {
  if (type === CommentType.SystemMessage) {
    return 'italic text-default-500';
  }
  return 'text-foreground';
};

export const CommentThread: React.FC<CommentThreadProps> = ({ comments, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-default-500">Loading comments...</div>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-default-500 text-sm">No comments yet.</p>
        <p className="text-default-400 text-xs mt-1">Be the first to add a comment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className={`p-4 rounded-lg border ${getCommentBackgroundClass(comment.commentType as any)}`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {comment.createdByUserName || comment.authorId || 'Unknown User'}
              </span>
              <Chip
                color={getCommentTypeColor(comment.commentType as any)}
                variant="flat"
                size="sm"
              >
                {getCommentTypeName(comment.commentType as any)}
              </Chip>
            </div>
            <span className="text-xs text-default-400">
              {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}
            </span>
          </div>
          <div
            className={`text-sm ${getCommentTextClass(comment.commentType as any)}`}
            // REVIEW: Using dangerouslySetInnerHTML for HTML content
            // TODO: Replace with proper HTML sanitization library if needed
            dangerouslySetInnerHTML={{ __html: comment.body ?? '' }}
          />
        </div>
      ))}
    </div>
  );
};
