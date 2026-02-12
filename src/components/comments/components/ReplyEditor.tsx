import { BaseButton } from '@brainforgeau/components/button';
import { BaseTextarea } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { useState, useCallback, useEffect } from 'react';
import { Switch, addToast } from '@heroui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CommentType, type CreateCommentCommand } from '@/types/comment';
import { CannedResponsePicker } from '@components/canned-responses';
import type { CannedResponseDto } from '@/types/canned-response';

interface ReplyEditorProps {
  ticketId: string;
  categoryId?: string;
  onCommentAdded?: () => void;
}

export const ReplyEditor: React.FC<ReplyEditorProps> = ({ ticketId, categoryId, onCommentAdded }) => {
  const [body, setBody] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (command: CreateCommentCommand) => {
      // TODO: Replace with actual API call when @brainforgeau/helpdesk-backend-client is available
      // const client = await createHelpdeskApiClient(CommentsApi);
      // await client.v1TicketsTicketIdCommentsPost(ticketId, command);
      console.log('Create comment:', command);
    },
    onSuccess: () => {
      addToast({
        title: isInternalNote ? 'Internal note added' : 'Reply posted',
        severity: 'success',
      });
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['helpdesk-comments', ticketId] });
      onCommentAdded?.();
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });

  const handleSubmit = useCallback(() => {
    if (!body.trim()) return;

    const command: CreateCommentCommand = {
      ticketId,
      body: body.trim(),
      commentType: isInternalNote ? CommentType.InternalNote : CommentType.Reply,
      idempotencyKey: `comment-${Date.now()}`,
    };

    mutation.mutate(command);
  }, [body, ticketId, isInternalNote, mutation]);

  const handleCannedResponseSelect = useCallback((response: CannedResponseDto) => {
    // REVIEW: Insert canned response - for now append, can be enhanced to replace or insert at cursor
    setBody(prev => prev ? `${prev}\n\n${response.body ?? ''}` : (response.body ?? ''));
  }, []);

  // REVIEW: Keyboard shortcut for submit (Cmd+Enter or Ctrl+Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Add Comment</h3>
        <div className="flex items-center gap-2">
          <BaseButton
            variant="bordered"
            size="sm"
            onPress={() => setIsPickerOpen(true)}
            icon={<Icon name="document-text" className="h-4 w-4" />}
          >
            Canned Response
          </BaseButton>
          <Switch
            isSelected={isInternalNote}
            onValueChange={setIsInternalNote}
            size="sm"
          >
            Internal Note
          </Switch>
        </div>
      </div>

      <div
        className={`rounded-lg border p-1 ${
          isInternalNote
            ? 'bg-warning-50 dark:bg-warning-100/10 border-warning-200 dark:border-warning-800'
            : 'bg-content1 border-divider'
        }`}
      >
        <BaseTextarea
          placeholder={
            isInternalNote
              ? 'Add an internal note (only visible to agents)...'
              : 'Write your reply...'
          }
          value={body}
          onValueChange={(value) => setBody(value)}
          minRows={4}
          className="border-0"
          // TODO: Replace with TipTap rich text editor when ready
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-default-400">
          Press <kbd className="px-1 py-0.5 text-xs rounded bg-default-100">Cmd+Enter</kbd> to send
        </span>
        <div className="flex gap-2">
          <BaseButton
            variant="bordered"
            size="sm"
            onPress={() => setBody('')}
            isDisabled={!body.trim() || mutation.isPending}
          >
            Clear
          </BaseButton>
          <BaseButton
            size="sm"
            onPress={handleSubmit}
            isLoading={mutation.isPending}
            isDisabled={!body.trim()}
          >
            {isInternalNote ? 'Add Internal Note' : 'Send Reply'}
          </BaseButton>
        </div>
      </div>

      <CannedResponsePicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleCannedResponseSelect}
        categoryId={categoryId}
      />
    </div>
  );
};
