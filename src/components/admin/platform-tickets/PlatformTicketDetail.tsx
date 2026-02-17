import { type FC, useCallback, useState, useRef } from 'react';
import { useNavigate, useParams } from '@modern-js/runtime/router';
import { BaseButton, Icon } from '@brainforgeau/components';
import { Box } from '@brainforgeau/components/base';
import { Spinner, Switch, addToast } from '@heroui/react';
import { StatusBadge } from '@/components/shared';
import {
  usePlatformTicketDetail,
  useUpdatePlatformTicketStatus,
  useAddPlatformTicketComment,
} from '@/components/admin/hooks/usePlatformTickets';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import type { PlatformTicketStatus, PlatformTicketComment } from '@/types/admin';
import DOMPurify from 'dompurify';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

const getStatusConfig = (status: PlatformTicketStatus) => {
  switch (status) {
    case 'New':
      return { label: 'New', color: 'primary' as const };
    case 'InProgress':
      return { label: 'In Progress', color: 'warning' as const };
    case 'Closed':
      return { label: 'Closed', color: 'default' as const };
    default:
      return { label: 'Unknown', color: 'default' as const };
  }
};

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'Critical':
      return { label: 'Critical', color: 'danger' as const };
    case 'High':
      return { label: 'High', color: 'warning' as const };
    case 'Normal':
      return { label: 'Normal', color: 'primary' as const };
    case 'None':
      return { label: 'None', color: 'default' as const };
    case 'Low':
      return { label: 'Low', color: 'default' as const };
    default:
      return { label: 'Unknown', color: 'default' as const };
  }
};

const CommentItem: FC<{ comment: PlatformTicketComment; authorName?: string }> = ({ comment, authorName }) => {
  // Phase 2: commentType is now a string ('Public' | 'Internal') instead of boolean isInternalNote
  const isInternal = comment.commentType === 'Internal';
  const bgClass = isInternal
    ? 'bg-warning-50 dark:bg-warning-100/10 border-warning-200 dark:border-warning-800'
    : 'bg-content1 border-divider';

  return (
    <div className={`p-4 rounded-lg border ${bgClass}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {authorName || comment.authorEmail || 'Unknown User'}
          </span>
          {isInternal && (
            <StatusBadge color="warning">Internal</StatusBadge>
          )}
        </div>
        <span className="text-xs text-default-400">
          {new Date(comment.createdAt).toLocaleString()}
        </span>
      </div>
      <div
        className={`text-sm ${isInternal ? '' : 'text-foreground'}`}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.body) }}
      />
    </div>
  );
};

export const PlatformTicketDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const replyEditorRef = useRef<HTMLDivElement>(null);
  const { data: ticket, isLoading, error } = usePlatformTicketDetail(id ?? '');
  const updateStatusMutation = useUpdatePlatformTicketStatus();
  const addCommentMutation = useAddPlatformTicketComment();

  const [isInternalNote, setIsInternalNote] = useState(false);

  // Enrich user data for submitter, assignee, and comment authors
  const commentAuthorIds = ticket?.comments?.map(c => c.authorId) ?? [];
  const allUserIds = [
    ticket?.requesterId,
    ticket?.assigneeId,
    ...commentAuthorIds,
  ].filter(Boolean);
  const { userMap } = useUserEnrichment(allUserIds);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: isInternalNote
          ? 'Add an internal note (only visible to support staff)...'
          : 'Write your reply...',
      }),
    ],
    content: '',
  });

  const handleBack = useCallback(() => {
    navigate('/admin/platform-tickets');
  }, [navigate]);

  const handleStatusChange = useCallback((status: PlatformTicketStatus) => {
    if (!id) return;
    updateStatusMutation.mutate(
      { ticketId: id, status },
      {
        onSuccess: () => {
          addToast({
            title: 'Status updated',
            description: `Ticket status changed to ${status}`,
            severity: 'success',
          });
        },
      }
    );
  }, [id, updateStatusMutation]);

  const handleSubmitComment = useCallback(() => {
    if (!editor || editor.isEmpty || !id) return;

    const html = editor.getHTML();
    addCommentMutation.mutate(
      { ticketId: id, body: html, isInternalNote },
      {
        onSuccess: () => {
          addToast({
            title: isInternalNote ? 'Internal note added' : 'Reply posted',
            severity: 'success',
          });
          editor.commands.clearContent();
        },
      }
    );
  }, [editor, id, isInternalNote, addCommentMutation]);

  const handleReply = useCallback(() => {
    replyEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      const editorElement = replyEditorRef.current?.querySelector('[contenteditable]');
      if (editorElement) {
        (editorElement as HTMLElement).focus();
      }
    }, 300);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Icon name="exclamation-triangle" className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Ticket Not Found</h2>
          <p className="text-muted-foreground mb-4">The platform ticket you are looking for does not exist.</p>
          <BaseButton onPress={handleBack}>Back to Platform Tickets</BaseButton>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(ticket.status as PlatformTicketStatus ?? 'New');
  const priorityConfig = getPriorityConfig(ticket.priority ?? 'None');
  const submitterName = userMap[ticket.requesterId ?? '']?.name ?? ticket.submitterEmail;
  const assigneeName = ticket.assigneeId ? (userMap[ticket.assigneeId]?.name ?? 'Assigned') : 'Unassigned';

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Back Button */}
      <div className="mb-4">
        <BaseButton
          variant="link"
          onPress={handleBack}
          icon={<Icon name="arrow-left" className="h-4 w-4" />}
        >
          Back to Platform Tickets
        </BaseButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <Box title={`Platform Ticket #${ticket.id?.substring(0, 8)}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
                  <StatusBadge color={statusConfig.color}>
                    {statusConfig.label}
                  </StatusBadge>
                  <StatusBadge color={priorityConfig.color}>
                    {priorityConfig.label}
                  </StatusBadge>
                </div>
              </div>
            </div>
          </Box>

          {/* Action Button Row */}
          <Box>
            <div className="flex items-center gap-3">
              <BaseButton
                color="primary"
                onPress={handleReply}
                icon={<Icon name="chat-bubble-left" className="h-4 w-4" />}
              >
                Reply
              </BaseButton>
              {ticket.status !== 'Closed' && (
                <BaseButton
                  variant="bordered"
                  onPress={() => handleStatusChange('Closed')}
                  icon={<Icon name="x-circle" className="h-4 w-4" />}
                >
                  Close
                </BaseButton>
              )}
              {ticket.status === 'New' && (
                <BaseButton
                  variant="bordered"
                  onPress={() => handleStatusChange('InProgress')}
                  icon={<Icon name="arrow-path" className="h-4 w-4" />}
                >
                  Mark In Progress
                </BaseButton>
              )}
            </div>
          </Box>

          {/* Description */}
          <Box title="Description">
            <div
              className="prose max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ticket.description ?? '') }}
            />
          </Box>

          {/* Comments */}
          <Box title={`Comments (${ticket.comments?.length ?? 0})`}>
            <div className="space-y-4">
              {ticket.comments?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-default-500 text-sm">No comments yet.</p>
                  <p className="text-default-400 text-xs mt-1">Be the first to add a comment.</p>
                </div>
              ) : (
                ticket.comments?.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment as unknown as PlatformTicketComment}
                    authorName={userMap[comment.authorId ?? '']?.name}
                  />
                ))
              )}

              {/* Reply Editor */}
              <div ref={replyEditorRef} className="space-y-3 pt-4 border-t border-divider">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Add Comment</h3>
                  <Switch
                    isSelected={isInternalNote}
                    onValueChange={setIsInternalNote}
                    size="sm"
                  >
                    Internal Note
                  </Switch>
                </div>

                <div
                  className={`rounded-lg border ${
                    isInternalNote
                      ? 'bg-warning-50 dark:bg-warning-100/10 border-warning-200 dark:border-warning-800'
                      : 'bg-content1 border-divider'
                  }`}
                >
                  {editor && (
                    <div className="flex items-center gap-1 border-b border-divider p-2">
                      <BaseButton
                        variant="light"
                        size="sm"
                        onPress={() => editor.chain().focus().toggleBold().run()}
                        isIconOnly
                        className={`font-bold ${editor.isActive('bold') ? 'bg-default-200' : ''}`}
                        title="Bold"
                      >
                        B
                      </BaseButton>
                      <BaseButton
                        variant="light"
                        size="sm"
                        onPress={() => editor.chain().focus().toggleItalic().run()}
                        isIconOnly
                        className={`italic ${editor.isActive('italic') ? 'bg-default-200' : ''}`}
                        title="Italic"
                      >
                        I
                      </BaseButton>
                      <BaseButton
                        variant="light"
                        size="sm"
                        onPress={() => editor.chain().focus().toggleBulletList().run()}
                        isIconOnly
                        className={editor.isActive('bulletList') ? 'bg-default-200' : ''}
                        title="Bullet List"
                      >
                        •
                      </BaseButton>
                    </div>
                  )}
                  <EditorContent
                    editor={editor}
                    className="prose prose-sm max-w-none dark:prose-invert px-3 py-2 min-h-[120px] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <BaseButton
                    variant="bordered"
                    size="sm"
                    onPress={() => editor?.commands.clearContent()}
                    isDisabled={editor?.isEmpty || addCommentMutation.isPending}
                  >
                    Clear
                  </BaseButton>
                  <BaseButton
                    size="sm"
                    onPress={handleSubmitComment}
                    isLoading={addCommentMutation.isPending}
                    isDisabled={!editor || editor.isEmpty}
                  >
                    {isInternalNote ? 'Add Internal Note' : 'Send Reply'}
                  </BaseButton>
                </div>
              </div>
            </div>
          </Box>

          {/* Activity Timeline */}
          <Box title="Activity Timeline">
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Icon name="plus" className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Ticket created</p>
                  <p className="text-xs text-default-500">
                    by {submitterName} on {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '—'}
                  </p>
                </div>
              </div>
              {ticket.modifiedAt && ticket.modifiedAt !== ticket.createdAt && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Icon name="pencil" className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Ticket updated</p>
                    <p className="text-xs text-default-500">
                      on {new Date(ticket.modifiedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Box>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Box title="Ticket Details">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-default-500 mb-1">Status</p>
                <StatusBadge color={statusConfig.color}>{statusConfig.label}</StatusBadge>
              </div>
              <div>
                <p className="text-xs font-medium text-default-500 mb-1">Priority</p>
                <StatusBadge color={priorityConfig.color}>{priorityConfig.label}</StatusBadge>
              </div>
              {ticket.categoryName && (
                <div>
                  <p className="text-xs font-medium text-default-500 mb-1">Category</p>
                  <p className="text-sm">{ticket.categoryName}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-default-500 mb-1">Submitter</p>
                <p className="text-sm">{submitterName}</p>
                <p className="text-xs text-default-400">{ticket.submitterEmail}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-default-500 mb-1">Tenant</p>
                <p className="text-sm">{ticket.submitterTenantName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-default-500 mb-1">Assignee</p>
                <p className="text-sm">{assigneeName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-default-500 mb-1">Created</p>
                <p className="text-sm">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-default-500 mb-1">Updated</p>
                <p className="text-sm">{ticket.modifiedAt ? new Date(ticket.modifiedAt).toLocaleString() : '—'}</p>
              </div>
            </div>
          </Box>
        </div>
      </div>
    </div>
  );
};
