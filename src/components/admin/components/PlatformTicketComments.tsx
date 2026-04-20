/**
 * PlatformTicketComments — comments section for a platform self-service ticket.
 *
 * Used in the ticket detail view for /v1/platform/my-tickets/{id}/comments.
 * Comments are sorted by date ascending (oldest first).
 */

import { BaseButton, BaseTextarea } from '@brainforgeau/components';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import { addToast } from '@heroui/react';
import { type FC, useCallback, useRef, useState } from 'react';
import {
  useAddPlatformTicketComment,
  usePlatformTicketComments,
} from '../hooks/usePlatformTickets';

export interface PlatformTicketCommentsProps {
  ticketId: string;
}

export const PlatformTicketComments: FC<PlatformTicketCommentsProps> = ({
  ticketId,
}) => {
  const timezone = useTimezone();
  const [commentBody, setCommentBody] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data, isLoading } = usePlatformTicketComments(ticketId);
  const addCommentMutation = useAddPlatformTicketComment(ticketId);

  const comments = data?.items ?? [];

  const handleSubmit = useCallback(() => {
    const body = commentBody.trim();
    if (!body) return;
    addCommentMutation.mutate(body, {
      onSuccess: () => {
        setCommentBody('');
        addToast({ title: 'Comment added', severity: 'success' });
      },
      onError: () => {
        addToast({ title: 'Failed to add comment', severity: 'danger' });
      },
    });
  }, [commentBody, addCommentMutation]);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-default-500">
        Comments
      </h3>

      {isLoading && (
        <p className="text-sm text-default-400">Loading comments...</p>
      )}

      {!isLoading && comments.length === 0 && (
        <p className="text-sm text-default-400">No comments yet.</p>
      )}

      {!isLoading && comments.length > 0 && (
        <ul className="flex flex-col gap-3">
          {[...comments]
            .sort(
              (a, b) =>
                new Date(a.createdAt ?? 0).getTime() -
                new Date(b.createdAt ?? 0).getTime(),
            )
            .map(comment => (
              <li key={comment.id} className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-xs text-default-400">
                    {comment.authorId
                      ? comment.authorId.substring(0, 8)
                      : 'System'}
                  </span>
                  <span className="text-xs text-default-400">
                    {comment.createdAt
                      ? formatDateTime(comment.createdAt, { timezone })
                      : ''}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{comment.body}</p>
              </li>
            ))}
        </ul>
      )}

      {/* Add comment form */}
      <div className="flex flex-col gap-2 mt-2">
        <BaseTextarea
          ref={textareaRef}
          label="Add a comment"
          placeholder="Type your comment..."
          value={commentBody}
          onValueChange={setCommentBody}
          minRows={2}
          maxRows={6}
        />
        <div className="flex justify-end">
          <BaseButton
            color="primary"
            size="sm"
            onPress={handleSubmit}
            isLoading={addCommentMutation.isPending}
            isDisabled={!commentBody.trim()}
          >
            Submit
          </BaseButton>
        </div>
      </div>
    </div>
  );
};
