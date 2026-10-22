import { CommentsApi } from '@/api/helpdesk-client';
import { useUploadAttachment } from '@/components/attachments/hooks/useAttachments';
import {
  AttachmentList,
  FileUploadZone,
  InlineImageButton,
} from '@/components/file-upload';
import { HelpdeskPermissions } from '@/constants/permissions';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { AttachmentDto } from '@/types';
import type { CannedResponseDto } from '@/types/canned-response';
import { CommentType } from '@/types/comment';
import { BaseToggle } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { RichTextEditor } from '@brainforgeau/components/text-editor';
import { usePermissions } from '@brainforgeau/security';
import { CannedResponsePicker } from '@components/canned-responses';
import { toast } from '@heroui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

interface ReplyEditorProps {
  ticketId: string;
  categoryId?: string;
  onCommentAdded?: () => void;
}

export const ReplyEditor: React.FC<ReplyEditorProps> = ({
  ticketId,
  categoryId,
  onCommentAdded,
}) => {
  // Posting an internal note needs tickets.update, as its endpoint does.
  // Without it the toggle is hidden so the request is never made.
  const { hasPermission } = usePermissions();
  const canPostInternalNote = hasPermission(HelpdeskPermissions.Tickets.Update);
  const [internalNoteSelected, setIsInternalNote] = useState(false);
  const isInternalNote = canPostInternalNote && internalNoteSelected;
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentDto[]>(
    [],
  );
  const queryClient = useQueryClient();
  const { uploadFiles, uploadProgress, isUploading } = useUploadAttachment();

  /*
   * The body as HTML, held here rather than inside a TipTap instance.
   *
   * This screen used to build its own TipTap editor and hand-roll a toolbar out
   * of BaseButtons, which is why the comment box looked nothing like the
   * description field directly above it: same job, two implementations, two
   * appearances. RichTextEditor is the design system's editor and is what the
   * description already uses, so the two now match and the toolbar styling is
   * not this file's problem any more.
   *
   * It is a controlled component (content + onChange), so "is there anything to
   * send" and "clear it" become plain state questions.
   */
  const [body, setBody] = useState('');

  /** TipTap emits "<p></p>" for an empty document, so length alone lies. */
  const isBodyEmpty = body.replace(/<[^>]*>/g, '').trim().length === 0;

  const mutation = useMutation({
    mutationFn: async (body: string) => {
      const client = await createHelpdeskApiClient(CommentsApi);

      // REVIEW: attachmentIds not yet supported in API command - will be added in backend implementation
      if (isInternalNote) {
        return await client.v1TicketsTicketIdCommentsInternalNotesPost(
          ticketId,
          {
            body,
            idempotencyKey: `comment-${Date.now()}`,
          },
        );
      } else {
        return await client.v1TicketsTicketIdCommentsPost(ticketId, {
          body,
          idempotencyKey: `comment-${Date.now()}`,
        });
      }
    },
    onSuccess: () => {
      toast(isInternalNote ? 'Internal note added' : 'Reply added', {
        variant: 'success',
      });
      setBody('');
      setPendingAttachments([]);
      setShowFileUpload(false);
      queryClient.invalidateQueries({
        queryKey: ['helpdesk-comments', ticketId],
      });
      queryClient.invalidateQueries({ queryKey: ['attachments', ticketId] });
      onCommentAdded?.();
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });

  const handleSubmit = useCallback(() => {
    if (isBodyEmpty) return;
    mutation.mutate(body);
  }, [body, isBodyEmpty, mutation]);

  const handleCannedResponseSelect = useCallback(
    (response: CannedResponseDto) => {
      if (response.body) setBody(response.body);
    },
    [],
  );

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      try {
        // REVIEW: Upload files and track them for comment association
        const uploadedFiles = await uploadFiles(files, ticketId, undefined);
        if (uploadedFiles && Array.isArray(uploadedFiles)) {
          setPendingAttachments(prev => [
            ...prev,
            ...(uploadedFiles as unknown as AttachmentDto[]),
          ]);
          toast(`${files.length} file(s) uploaded successfully`, {
            variant: 'success',
          });
        }
      } catch (error) {
        toast('Upload failed', { variant: 'danger' });
      }
    },
    [ticketId, uploadFiles],
  );

  const handleRemovePendingAttachment = useCallback((attachmentId: string) => {
    setPendingAttachments(prev => prev.filter(a => a.id !== attachmentId));
  }, []);

  const handleInsertImage = useCallback(() => {
    // REVIEW: For now, just show file upload zone
    // When TipTap is integrated, this will insert inline image in editor
    setShowFileUpload(true);
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
            color="light"
            size="sm"
            onPress={() => setIsPickerOpen(true)}
            icon={<Icon name="document-text" className="h-4 w-4" />}
          >
            Canned Response
          </BaseButton>
          {canPostInternalNote && (
            <BaseToggle
              isSelected={isInternalNote}
              onChange={setIsInternalNote}
            >
              Internal Note
            </BaseToggle>
          )}
        </div>
      </div>

      {/*
        The design system's editor, the same component the ticket description
        uses. The internal-note tint stays on the wrapper so the box still turns
        amber when the toggle is on.
      */}
      <div
        className={`rounded-lg border ${
          isInternalNote
            ? 'bg-warning-50 dark:bg-warning-100/10 border-warning-200 dark:border-warning-800'
            : 'bg-content1 border-divider'
        }`}
      >
        <RichTextEditor
          content={body}
          onChange={setBody}
          placeholder={
            isInternalNote
              ? 'Add an internal note (only visible to agents)...'
              : 'Write your reply...'
          }
        />
      </div>

      {/* File Attachment Controls */}
      <div className="flex items-center gap-2">
        <BaseButton
          variant="light"
          size="sm"
          onPress={() => setShowFileUpload(!showFileUpload)}
          icon={<Icon name="paper-clip" className="h-4 w-4" />}
        >
          {showFileUpload ? 'Hide' : 'Attach Files'}
        </BaseButton>
        <InlineImageButton
          onInsertImage={handleInsertImage}
          disabled={isUploading}
        />
        {pendingAttachments.length > 0 && (
          <span className="text-default-500 text-xs">
            {pendingAttachments.length} file(s) attached
          </span>
        )}
      </div>

      {/* File Upload Zone */}
      {showFileUpload && (
        <div className="space-y-3">
          <FileUploadZone
            onFilesSelected={handleFilesSelected}
            progress={uploadProgress}
            multiple={true}
          />
          {pendingAttachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-default-600 text-xs font-medium">
                Pending Attachments:
              </p>
              <AttachmentList
                attachments={pendingAttachments}
                onDelete={handleRemovePendingAttachment}
                canDelete={true}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-default-400 text-xs">
          Press{' '}
          <kbd className="bg-default-100 rounded px-1 py-0.5 text-xs">
            {/* REVIEW: navigator.userAgentData?.platform is the modern API; fall back to
                navigator.platform for browsers that don't support it (Firefox, Safari).
                Both return a string containing "Mac" on macOS. */}
            {typeof navigator !== 'undefined' &&
            /mac/i.test(
              (
                navigator as Navigator & {
                  userAgentData?: { platform?: string };
                }
              ).userAgentData?.platform ?? navigator.platform,
            )
              ? 'Cmd+Enter'
              : 'Ctrl+Enter'}
          </kbd>{' '}
          to send
        </span>
        <div className="flex gap-2">
          <BaseButton
            variant="bordered"
            color="light"
            size="sm"
            onPress={() => {
              setBody('');
              setPendingAttachments([]);
            }}
            isDisabled={
              (isBodyEmpty && pendingAttachments.length === 0) ||
              mutation.isPending
            }
          >
            Clear
          </BaseButton>
          <BaseButton
            size="sm"
            onPress={handleSubmit}
            isDisabled={mutation.isPending || isUploading || isBodyEmpty}
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
