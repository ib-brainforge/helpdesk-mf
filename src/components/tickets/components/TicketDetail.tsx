import { type FC, useCallback, useState, useRef } from 'react';
import { useNavigate, useParams } from '@modern-js/runtime/router';
import { BaseButton, Icon } from '@brainforgeau/components';
import { Box } from '@brainforgeau/components/base';
import { PermissionGuard, useAuth } from '@brainforgeau/security';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { StatusBadge } from '@/components/shared';
import { useTicketDetail, useUpdateTicket } from '../hooks/useTickets';
import { TicketDetailSidebar } from './TicketDetailSidebar';
import { FileUploadZone } from '@/components/file-upload/FileUploadZone';
import { AttachmentList } from '@/components/file-upload/AttachmentList';
import { SlaIndicator } from '@/components/sla/SlaIndicator';
import { TimeTracker } from '@/components/sla/TimeTracker';
import { CSATWidget } from './CSATWidget';
import { useAttachments, useUploadAttachment, useDeleteAttachment } from '@/components/attachments/hooks/useAttachments';
import { useSla } from '@/components/sla/hooks/useSla';
import { useTimeTracking, useStartTimer, useStopTimer, usePauseTimer, useAddTimeEntry, useDeleteTimeEntry } from '@/components/sla/hooks/useTimeTracking';
import { HelpdeskPermissions } from '@/constants/permissions';
import { TicketStatus, TicketPriority } from '@/types/ticket';
import { useRealtimeComments } from '@/hooks/useRealtimeComments';
import { TicketApprovalPanel } from '@/components/approvals';
import { CommentThread } from '@/components/comments/components/CommentThread';
import { ReplyEditor } from '@/components/comments/components/ReplyEditor';
import { useComments } from '@/components/comments/hooks/useComments';
import { MergeTicketModal } from './MergeTicketModal';
import { LinkTicketModal } from './LinkTicketModal';
import { AiAssistantModal } from './AiAssistantModal';
import { NewTicketModal } from './NewTicketModal';
import { useMergeTickets, useLinkTickets } from '../hooks/useTickets';
import { addToast } from '@heroui/react';

const getStatusConfig = (status: TicketStatus) => {
  switch (status) {
    case TicketStatus.New:
      return { label: 'New', color: 'primary' as const };
    case TicketStatus.InProgress:
      return { label: 'In Progress', color: 'warning' as const };
    case TicketStatus.Closed:
      return { label: 'Closed', color: 'success' as const };
    default:
      return { label: 'Unknown', color: 'default' as const };
  }
};

const getPriorityConfig = (priority: TicketPriority) => {
  switch (priority) {
    case TicketPriority.Critical:
      return { label: 'Critical', color: 'danger' as const };
    case TicketPriority.High:
      return { label: 'High', color: 'warning' as const };
    case TicketPriority.Normal:
      return { label: 'Normal', color: 'primary' as const };
    case TicketPriority.Low:
      return { label: 'Low', color: 'default' as const };
    case TicketPriority.None:
      return { label: 'None', color: 'default' as const };
    default:
      return { label: 'Unknown', color: 'default' as const };
  }
};

export const TicketDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.profile?.sub;
  const replyEditorRef = useRef<HTMLDivElement>(null);
  const { data: ticket, isLoading, error } = useTicketDetail(id ?? '');
  const updateTicketMutation = useUpdateTicket();

  // REVIEW: Real-time updates via SignalR - auto-refreshes comments when added/updated
  useRealtimeComments(id ?? '');

  // Comments
  const { comments, isLoading: commentsLoading } = useComments(id ?? '');

  // Attachments
  const { attachments, isLoading: attachmentsLoading } = useAttachments(id);
  const { uploadFiles, uploadProgress, isUploading } = useUploadAttachment();
  const deleteAttachmentMutation = useDeleteAttachment();

  // SLA
  const { slaData } = useSla(id ?? '');

  // Time Tracking
  const { timeTracking } = useTimeTracking(id ?? '');
  const startTimerMutation = useStartTimer();
  const stopTimerMutation = useStopTimer();
  const pauseTimerMutation = usePauseTimer();
  const addTimeEntryMutation = useAddTimeEntry();
  const deleteTimeEntryMutation = useDeleteTimeEntry();
  const mergeTicketsMutation = useMergeTickets();
  const linkTicketsMutation = useLinkTickets();

  const [showAttachments, setShowAttachments] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);

  const handleUpdate = useCallback(
    (updates: any) => {
      if (!id) return;
      updateTicketMutation.mutate({ id, updates });
    },
    [id, updateTicketMutation]
  );

  const handleBack = useCallback(() => {
    navigate('/tickets');
  }, [navigate]);

  const handleMerge = useCallback(() => {
    setIsMergeModalOpen(true);
  }, []);

  const handleLink = useCallback(() => {
    setIsLinkModalOpen(true);
  }, []);

  const handleAiAssistant = useCallback(() => {
    setIsAiAssistantOpen(true);
  }, []);

  const handleComingSoon = useCallback((feature: string) => {
    addToast({
      title: 'Coming soon',
      description: `${feature} will be available soon`,
      severity: 'warning',
    });
  }, []);

  const handleMergeConfirm = useCallback((targetTicketId: string) => {
    if (!id) return;
    mergeTicketsMutation.mutate(
      { primaryTicketId: targetTicketId, ticketIdToMerge: id },
      {
        onSuccess: () => {
          addToast({
            title: 'Tickets merged',
            description: `Ticket merged into ${targetTicketId.substring(0, 8)}`,
            severity: 'success',
          });
          navigate(`/tickets/${targetTicketId}`);
        },
      }
    );
  }, [id, mergeTicketsMutation, navigate]);

  const handleLinkConfirm = useCallback((targetTicketId: string, linkType: string) => {
    if (!id) return;
    linkTicketsMutation.mutate(
      { sourceTicketId: id, targetTicketId, linkType },
      {
        onSuccess: () => {
          addToast({
            title: 'Tickets linked',
            description: `Linked to ticket ${targetTicketId.substring(0, 8)}`,
            severity: 'success',
          });
        },
      }
    );
  }, [id, linkTicketsMutation]);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (!id) return;
      await uploadFiles(files, id, undefined);
    },
    [id, uploadFiles]
  );

  const handleDeleteAttachment = useCallback(
    (attachmentId: string) => {
      deleteAttachmentMutation.mutate(attachmentId);
    },
    [deleteAttachmentMutation]
  );

  const handleStartTimer = useCallback(() => {
    if (!id) return;
    startTimerMutation.mutate(id);
  }, [id, startTimerMutation]);

  const handleStopTimer = useCallback(() => {
    if (!id) return;
    stopTimerMutation.mutate(id);
  }, [id, stopTimerMutation]);

  const handlePauseTimer = useCallback(() => {
    if (!id) return;
    pauseTimerMutation.mutate(id);
  }, [id, pauseTimerMutation]);

  const handleAddManualEntry = useCallback(
    (minutes: number, notes: string) => {
      if (!id) return;
      addTimeEntryMutation.mutate({
        ticketId: id,
        durationMinutes: minutes,
        notes,
      });
    },
    [id, addTimeEntryMutation]
  );

  const handleDeleteTimeEntry = useCallback(
    (entryId: string) => {
      if (!id) return;
      deleteTimeEntryMutation.mutate({ entryId, ticketId: id });
    },
    [id, deleteTimeEntryMutation]
  );

  const handleReply = useCallback(() => {
    // Scroll to reply editor
    replyEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Focus the editor after scroll
    setTimeout(() => {
      const editorElement = replyEditorRef.current?.querySelector('[contenteditable]');
      if (editorElement) {
        (editorElement as HTMLElement).focus();
      }
    }, 300);
  }, []);

  const handleTakeover = useCallback(() => {
    if (!id || !currentUserId) return;
    updateTicketMutation.mutate(
      { id, updates: { assigneeId: currentUserId } },
      {
        onSuccess: () => {
          addToast({
            title: 'Ticket assigned',
            description: 'Ticket has been assigned to you',
            severity: 'success',
          });
        },
      }
    );
  }, [id, currentUserId, updateTicketMutation]);

  const handleCloseTicket = useCallback(() => {
    if (!id) return;
    updateTicketMutation.mutate(
      { id, updates: { status: TicketStatus.Closed } },
      {
        onSuccess: () => {
          addToast({
            title: 'Ticket closed',
            description: 'Ticket status updated to Closed',
            severity: 'success',
          });
        },
      }
    );
  }, [id, updateTicketMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Icon name="exclamation-triangle" className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Ticket Not Found</h2>
          <p className="text-gray-600 mb-4">The ticket you are looking for does not exist.</p>
          <BaseButton onPress={handleBack}>Back to Tickets</BaseButton>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(ticket.status as any);
  const priorityConfig = getPriorityConfig(ticket.priority as any);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back Button */}
      <div className="mb-4">
        <BaseButton
          variant="link"
          onPress={handleBack}
          icon={<Icon name="arrow-left" className="h-4 w-4" />}
        >
          Back to Tickets
        </BaseButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <Box title={`Ticket #${ticket.id?.substring(0, 8)}`}>
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

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <PermissionGuard requiredPermissions={[HelpdeskPermissions.TicketWrite]} fallback={null}>
                  <BaseButton
                    variant="bordered"
                    onPress={handleAiAssistant}
                    icon={<Icon name="flash" className="h-4 w-4" />}
                  >
                    AI Assistant
                  </BaseButton>
                </PermissionGuard>
                <PermissionGuard requiredPermissions={[HelpdeskPermissions.TicketWrite]} fallback={null}>
                  <Dropdown>
                    <DropdownTrigger>
                      <BaseButton
                        variant="bordered"
                        icon={<Icon name="dotsV" className="h-4 w-4" />}
                      />
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Ticket actions">
                      <DropdownItem key="summary" onPress={() => handleComingSoon('Ticket Summary')}>
                        Ticket Summary
                      </DropdownItem>
                      <DropdownItem key="edit" onPress={() => handleComingSoon('Edit')}>
                        Edit
                      </DropdownItem>
                      <DropdownItem key="spam" onPress={() => handleComingSoon('Mark As Spam')}>
                        Mark As Spam
                      </DropdownItem>
                      <DropdownItem key="forward" onPress={() => handleComingSoon('Forward Ticket By Email')}>
                        Forward Ticket By Email
                      </DropdownItem>
                      <DropdownItem key="print" onPress={() => handleComingSoon('Print')}>
                        Print
                      </DropdownItem>
                      <DropdownItem key="close" onPress={() => handleUpdate({ status: TicketStatus.Closed })}>
                        Close Ticket
                      </DropdownItem>
                      <DropdownItem key="duplicate" onPress={() => handleComingSoon('Duplicate')}>
                        Duplicate
                      </DropdownItem>
                      <DropdownItem key="merge" onPress={handleMerge}>
                        Merge
                      </DropdownItem>
                      <DropdownItem key="subtask" onPress={() => handleComingSoon('Add Subtask')}>
                        Add Subtask
                      </DropdownItem>
                      <DropdownItem key="parent" onPress={() => handleComingSoon('Add Parent Ticket')}>
                        Add Parent Ticket
                      </DropdownItem>
                      <DropdownItem key="convert" onPress={() => handleComingSoon('Convert To Reply')}>
                        Convert To Reply
                      </DropdownItem>
                      <DropdownItem key="problem" onPress={() => handleComingSoon('Problem/Idol')}>
                        Problem/Idol
                      </DropdownItem>
                      <DropdownItem key="publish" onPress={() => handleComingSoon('Publish To Ideas Forum')}>
                        Publish To "Ideas Forum"
                      </DropdownItem>
                      <DropdownItem key="subscribe" onPress={() => handleComingSoon('Subscribe')}>
                        Subscribe
                      </DropdownItem>
                      <DropdownItem key="systemlog" onPress={() => handleComingSoon('Toggle System Log')}>
                        Hide/Show System Log Entries
                      </DropdownItem>
                      <DropdownItem key="delete" className="text-danger" color="danger" onPress={() => handleComingSoon('Delete')}>
                        Delete
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </PermissionGuard>
              </div>
            </div>
          </Box>

          {/* Action Button Row */}
          <Box>
            <div className="flex items-center gap-3">
              <PermissionGuard requiredPermissions={[HelpdeskPermissions.TicketWrite]} fallback={null}>
                <BaseButton
                  onPress={() => setIsNewTicketModalOpen(true)}
                  icon={<Icon name="plus" className="h-4 w-4" />}
                >
                  New Ticket
                </BaseButton>
              </PermissionGuard>
              <PermissionGuard requiredPermissions={[HelpdeskPermissions.TicketWrite]} fallback={null}>
                <BaseButton
                  color="primary"
                  onPress={handleReply}
                  icon={<Icon name="chat-bubble-left" className="h-4 w-4" />}
                >
                  Reply
                </BaseButton>
              </PermissionGuard>
              <PermissionGuard requiredPermissions={[HelpdeskPermissions.TicketAssign]} fallback={null}>
                <BaseButton
                  variant="bordered"
                  onPress={handleTakeover}
                  icon={<Icon name="user-plus" className="h-4 w-4" />}
                  isDisabled={ticket.assigneeId === currentUserId}
                >
                  Takeover
                </BaseButton>
              </PermissionGuard>
              <PermissionGuard requiredPermissions={[HelpdeskPermissions.TicketWrite]} fallback={null}>
                <BaseButton
                  variant="bordered"
                  onPress={handleCloseTicket}
                  icon={<Icon name="check-circle" className="h-4 w-4" />}
                  isDisabled={ticket.status === TicketStatus.Closed}
                >
                  Close ticket
                </BaseButton>
              </PermissionGuard>
            </div>
          </Box>

          {/* Description */}
          <Box title="Description">
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </Box>

          {/* Attachments */}
          <Box title="Attachments">
            <div className="flex items-center justify-end mb-4">
              <BaseButton
                size="sm"
                variant="light"
                onPress={() => setShowAttachments(!showAttachments)}
                icon={<Icon name={showAttachments ? 'chevron-up' : 'chevron-down'} className="h-4 w-4" />}
              >
                {showAttachments ? 'Hide' : 'Show'}
              </BaseButton>
            </div>

            {showAttachments && (
              <div className="space-y-4">
                <PermissionGuard requiredPermissions={[HelpdeskPermissions.TicketWrite]}>
                  <FileUploadZone
                    onFilesSelected={handleFilesSelected}
                    progress={uploadProgress}
                  />
                </PermissionGuard>

                {attachmentsLoading ? (
                  <div className="text-center py-4">Loading attachments...</div>
                ) : (
                  <AttachmentList
                    attachments={attachments}
                    onDelete={handleDeleteAttachment}
                    canDelete={true}
                  />
                )}
              </div>
            )}
          </Box>

          {/* Comment Thread */}
          <Box title="Comments">
            <div className="space-y-4">
              <CommentThread comments={comments} isLoading={commentsLoading} />
              <div ref={replyEditorRef}>
                <ReplyEditor ticketId={id ?? ''} categoryId={ticket.categoryId ?? undefined} />
              </div>
              {/* Subscriber info */}
              {(ticket as any).subscriberIds && (ticket as any).subscriberIds.length > 0 && (
                <p className="text-xs text-gray-500">
                  (subscribers: {(ticket as any).subscriberIds.length} user{(ticket as any).subscriberIds.length !== 1 ? 's' : ''})
                </p>
              )}
            </div>
          </Box>

          {/* Activity Timeline - Placeholder */}
          <Box title="Activity Timeline">
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Icon name="plus" className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Ticket created</p>
                  <p className="text-xs text-gray-500">
                    by {ticket.requesterName} on{' '}
                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : ''}
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
                    <p className="text-xs text-gray-500">
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
          {/* Ticket Info */}
          <Box title="Ticket Details">
            <TicketDetailSidebar
              ticket={ticket}
              onUpdate={handleUpdate}
              isUpdating={updateTicketMutation.isPending}
            />
          </Box>

          {/* SLA Indicator */}
          {slaData && (
            <SlaIndicator slaData={slaData} variant="full" />
          )}

          {/* Time Tracker */}
          <TimeTracker
            ticketId={id ?? ''}
            timeTracking={timeTracking}
            onStartTimer={handleStartTimer}
            onStopTimer={handleStopTimer}
            onPauseTimer={handlePauseTimer}
            onAddManualEntry={handleAddManualEntry}
            onDeleteEntry={handleDeleteTimeEntry}
          />

          {/* Approval Panel */}
          <TicketApprovalPanel ticketId={id ?? ''} />

          {/* CSAT Widget */}
          <CSATWidget ticketId={id ?? ''} ticketStatus={ticket.status as any} />
        </div>
      </div>

      {/* Modals */}
      <MergeTicketModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        onConfirm={handleMergeConfirm}
        currentTicketId={id ?? ''}
      />
      <LinkTicketModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onConfirm={handleLinkConfirm}
        currentTicketId={id ?? ''}
      />
      <AiAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
      />
      <NewTicketModal
        isOpen={isNewTicketModalOpen}
        onClose={() => setIsNewTicketModalOpen(false)}
        onCreated={(ticketId) => navigate(`/tickets/${ticketId}`)}
      />
    </div>
  );
};
