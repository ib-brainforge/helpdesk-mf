import { useUploadAttachment } from '@/components/attachments/hooks/useAttachments';
import {
  AttachmentList,
  FileUploadZone,
  InlineImageButton,
} from '@/components/file-upload';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { AttachmentDto } from '@/types';
import type { CannedResponseDto } from '@/types/canned-response';
import { CommentType } from '@/types/comment';
import { BaseToggle } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { CommentsApi } from '@brainforgeau/helpdesk-client';
import { CannedResponsePicker } from '@components/canned-responses';
import { toast } from '@heroui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
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
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentDto[]>(
    [],
  );
  const queryClient = useQueryClient();
  const { uploadFiles, uploadProgress, isUploading } = useUploadAttachment();

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({
        placeholder: isInternalNote
          ? 'Add an internal note (only visible to agents)...'
          : 'Write your reply...',
      }),
    ],
    content: '',
  });

  // Update placeholder when internal note toggle changes
  useEffect(() => {
    if (editor) {
      editor.extensionManager.extensions.forEach(ext => {
        if (ext.name === 'placeholder') {
          editor.commands.focus();
        }
      });
    }
  }, [isInternalNote, editor]);

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
      editor?.commands.clearContent();
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
    if (!editor || editor.isEmpty) return;

    const html = editor.getHTML();
    mutation.mutate(html);
  }, [editor, mutation]);

  const handleCannedResponseSelect = useCallback(
    (response: CannedResponseDto) => {
      // Insert canned response into TipTap editor
      if (editor && response.body) {
        editor.commands.setContent(response.body);
      }
    },
    [editor],
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
            size="sm"
            onPress={() => setIsPickerOpen(true)}
            icon={<Icon name="document-text" className="h-4 w-4" />}
          >
            Canned Response
          </BaseButton>
          <BaseToggle
            isSelected={isInternalNote}
            onChange={setIsInternalNote}
          >
            Internal Note
          </BaseToggle>
        </div>
      </div>

      {/* TipTap Editor */}
      <div
        className={`rounded-lg border ${
          isInternalNote
            ? 'bg-warning-50 dark:bg-warning-100/10 border-warning-200 dark:border-warning-800'
            : 'bg-content1 border-divider'
        }`}
      >
        {/* Editor Toolbar */}
        {editor && (
          <div className="flex items-center gap-1 border-b border-divider p-2">
            <BaseButton
              variant="light"
              size="sm"
              onPress={() => editor.chain().focus().toggleBold().run()}
              isIconOnly
              className={`font-bold ${editor.isActive('bold') ? 'bg-default-200' : ''}`}
              aria-label="Bold"
            >
              B
            </BaseButton>
            <BaseButton
              variant="light"
              size="sm"
              onPress={() => editor.chain().focus().toggleItalic().run()}
              isIconOnly
              className={`italic ${editor.isActive('italic') ? 'bg-default-200' : ''}`}
              aria-label="Italic"
            >
              I
            </BaseButton>
            <BaseButton
              variant="light"
              size="sm"
              onPress={() => editor.chain().focus().toggleBulletList().run()}
              isIconOnly
              className={editor.isActive('bulletList') ? 'bg-default-200' : ''}
              aria-label="Bullet List"
            >
              •
            </BaseButton>
            <BaseButton
              variant="light"
              size="sm"
              onPress={() => editor.chain().focus().toggleOrderedList().run()}
              isIconOnly
              className={editor.isActive('orderedList') ? 'bg-default-200' : ''}
              aria-label="Numbered List"
            >
              1.
            </BaseButton>
            <div className="w-px h-6 bg-divider mx-1" />
            <BaseButton
              variant="light"
              size="sm"
              onPress={() => {
                const url = window.prompt('Enter URL:');
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }}
              isIconOnly
              className={editor.isActive('link') ? 'bg-default-200' : ''}
              aria-label="Insert Link"
            >
              🔗
            </BaseButton>
          </div>
        )}

        {/* Editor Content */}
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none dark:prose-invert px-3 py-2 min-h-[120px] focus:outline-none"
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
          <span className="text-xs text-default-500">
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
              <p className="text-xs font-medium text-default-600">
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
        <span className="text-xs text-default-400">
          Press{' '}
          <kbd className="px-1 py-0.5 text-xs rounded bg-default-100">
            {/* REVIEW: navigator.userAgentData?.platform is the modern API; fall back to
                navigator.platform for browsers that don't support it (Firefox, Safari).
                Both return a string containing "Mac" on macOS. */}
            {typeof navigator !== 'undefined' &&
            (/mac/i).test(
              (navigator as Navigator & { userAgentData?: { platform?: string } })
                .userAgentData?.platform ?? navigator.platform
            )
              ? 'Cmd+Enter'
              : 'Ctrl+Enter'}
          </kbd>{' '}
          to send
        </span>
        <div className="flex gap-2">
          <BaseButton
            variant="bordered"
            size="sm"
            onPress={() => {
              editor?.commands.clearContent();
              setPendingAttachments([]);
            }}
            isDisabled={
              (editor?.isEmpty && pendingAttachments.length === 0) ||
              mutation.isPending
            }
          >
            Clear
          </BaseButton>
          <BaseButton
            size="sm"
            onPress={handleSubmit}
            isDisabled={
              mutation.isPending || isUploading || !editor || editor.isEmpty
            }
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
