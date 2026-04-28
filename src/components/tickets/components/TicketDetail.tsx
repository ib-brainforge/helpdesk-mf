import { TicketApprovalPanel } from '@/components/approvals';
import {
  useAttachments,
  useDeleteAttachment,
  useUploadAttachment,
} from '@/components/attachments/hooks/useAttachments';
import { CommentThread } from '@/components/comments/components/CommentThread';
import { ReplyEditor } from '@/components/comments/components/ReplyEditor';
import { useComments } from '@/components/comments/hooks/useComments';
import { AttachmentList } from '@/components/file-upload/AttachmentList';
import { FileUploadZone } from '@/components/file-upload/FileUploadZone';
import { StatusBadge } from '@/components/shared';
import { SlaIndicator } from '@/components/sla/SlaIndicator';
import { TimeTracker } from '@/components/sla/TimeTracker';
import { useSla } from '@/components/sla/hooks/useSla';
import {
  useAddTimeEntry,
  useDeleteTimeEntry,
  usePauseTimer,
  useStartTimer,
  useStopTimer,
  useTimeTracking,
} from '@/components/sla/hooks/useTimeTracking';
import { HelpdeskPermissions } from '@/constants/permissions';
import { useRealtimeComments } from '@/hooks/useRealtimeComments';
import { CommentType } from '@/types/comment';
import { TicketPriority, TicketStatus } from '@/types/ticket';
import { BaseButton, Icon } from '@brainforgeau/components';
import { Box, PageSpinner } from '@brainforgeau/components/base';
import { formatDateTime } from '@brainforgeau/components/utils';
import { PermissionGuard, useAuth, useTimezone } from '@brainforgeau/security';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
} from '@heroui/react';
import { addToast } from '@heroui/react';
import { useNavigate, useParams } from '@modern-js/runtime/router';
import { type FC, useCallback, useRef, useState } from 'react';
import {
  useConvertToReply,
  useCreateSubtask,
  useDeleteTicket,
  useDuplicateTicket,
  useLinkTickets,
  useMarkTicketAsProblem,
  useMarkTicketAsSpam,
  useMergeTickets,
  useMyTicketSubscription,
  usePublishTicketAsIdea,
  useSetTicketParent,
  useSubscribeToTicket,
  useTicketChildren,
  useTicketDetail,
  useUnmarkTicketAsProblem,
  useUnmarkTicketAsSpam,
  useUnpublishTicketAsIdea,
  useUnsubscribeFromTicket,
  useUpdateTicket,
} from '../hooks/useTickets';
import { AddParentTicketModal } from './AddParentTicketModal';
import { AddSubtaskModal } from './AddSubtaskModal';
import { AiAssistantModal } from './AiAssistantModal';
import { CSATWidget } from './CSATWidget';
import { ConvertToReplyModal } from './ConvertToReplyModal';
import { DeleteTicketModal } from './DeleteTicketModal';
import { DuplicateTicketModal } from './DuplicateTicketModal';
import { EditTicketModal } from './EditTicketModal';
import { ForwardTicketModal } from './ForwardTicketModal';
import { LinkTicketModal } from './LinkTicketModal';
import { MarkSpamModal } from './MarkSpamModal';
import { MergeTicketModal } from './MergeTicketModal';
import { NewTicketModal } from './NewTicketModal';
import { TicketDetailSidebar } from './TicketDetailSidebar';

const SYSTEM_LOG_PREF_KEY = 'helpdesk:show-system-log';

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

export interface TicketDetailProps {
  ticketId?: string;
}

export const TicketDetail: FC<TicketDetailProps> = ({ ticketId }) => {
  const { id: urlId } = useParams<{ id: string }>();
  const id = ticketId ?? urlId;
  const navigate = useNavigate();
  const timezone = useTimezone();
  const { user } = useAuth();
  const currentUserId = user?.profile?.sub;
  const replyEditorRef = useRef<HTMLDivElement>(null);
  const { data: ticket, isLoading, error } = useTicketDetail(id ?? '');
  const updateTicketMutation = useUpdateTicket();

  // Tenant tickets have full feature set
  useRealtimeComments(id ?? '');

  const { comments, isLoading: commentsLoading } = useComments(id ?? '');

  // Attachments
  const { attachments, isLoading: attachmentsLoading } = useAttachments(id);
  const { uploadFiles, uploadProgress } = useUploadAttachment();
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

  // Wave 2 mutations
  const deleteTicketMutation = useDeleteTicket();
  const markSpamMutation = useMarkTicketAsSpam();
  const unmarkSpamMutation = useUnmarkTicketAsSpam();
  const { data: isSubscribed } = useMyTicketSubscription(id ?? '');
  const subscribeMutation = useSubscribeToTicket(id ?? '');
  const unsubscribeMutation = useUnsubscribeFromTicket(id ?? '');

  // Wave 3 mutations
  const duplicateTicketMutation = useDuplicateTicket();
  const convertToReplyMutation = useConvertToReply();
  const setParentMutation = useSetTicketParent();
  const { data: children } = useTicketChildren(id ?? '');

  // Wave 6 mutations
  const createSubtaskMutation = useCreateSubtask();
  const markAsProblemMutation = useMarkTicketAsProblem();
  const unmarkAsProblemMutation = useUnmarkTicketAsProblem();
  const publishAsIdeaMutation = usePublishTicketAsIdea();
  const unpublishAsIdeaMutation = useUnpublishTicketAsIdea();

  const [showAttachments, setShowAttachments] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMarkSpamModalOpen, setIsMarkSpamModalOpen] = useState(false);

  // Wave 3 modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isConvertToReplyModalOpen, setIsConvertToReplyModalOpen] =
    useState(false);
  const [isAddParentModalOpen, setIsAddParentModalOpen] = useState(false);

  // Wave 6 modal state
  const [isAddSubtaskModalOpen, setIsAddSubtaskModalOpen] = useState(false);

  // Hide/Show System Log — persisted in localStorage
  const [showSystemLog, setShowSystemLog] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SYSTEM_LOG_PREF_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const handleToggleSystemLog = useCallback(() => {
    setShowSystemLog(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SYSTEM_LOG_PREF_KEY, String(next));
      } catch {
        // localStorage unavailable — ignore
      }
      return next;
    });
  }, []);

  const visibleComments = showSystemLog
    ? comments
    : comments.filter(
        c => (c as any).commentType !== CommentType.SystemMessage,
      );

  const handleUpdate = useCallback(
    (updates: any) => {
      if (!id) return;
      updateTicketMutation.mutate({ id, updates });
    },
    [id, updateTicketMutation],
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

  // Subscribe / Unsubscribe
  const handleSubscribeToggle = useCallback(() => {
    if (!id) return;
    if (isSubscribed) {
      unsubscribeMutation.mutate(undefined, {
        onSuccess: () => {
          addToast({
            title: 'Unsubscribed',
            description:
              'You will no longer receive notifications for this ticket.',
            severity: 'success',
          });
        },
        onError: () => {
          addToast({
            title: 'Error',
            description: 'Failed to unsubscribe. Please try again.',
            severity: 'danger',
          });
        },
      });
    } else {
      subscribeMutation.mutate(undefined, {
        onSuccess: () => {
          addToast({
            title: 'Subscribed',
            description:
              'You will receive notifications for updates to this ticket.',
            severity: 'success',
          });
        },
        onError: () => {
          addToast({
            title: 'Error',
            description: 'Failed to subscribe. Please try again.',
            severity: 'danger',
          });
        },
      });
    }
  }, [id, isSubscribed, subscribeMutation, unsubscribeMutation]);

  // Delete
  const handleDeleteConfirm = useCallback(() => {
    if (!id) return;
    deleteTicketMutation.mutate(id, {
      onSuccess: () => {
        addToast({
          title: 'Ticket deleted',
          description: 'The ticket has been moved to trash.',
          severity: 'success',
        });
        navigate('/tickets');
      },
      onError: () => {
        addToast({
          title: 'Error',
          description: 'Failed to delete ticket. Please try again.',
          severity: 'danger',
        });
        setIsDeleteModalOpen(false);
      },
    });
  }, [id, deleteTicketMutation, navigate]);

  // Print
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Mark As Spam
  const handleMarkSpamConfirm = useCallback(() => {
    if (!id) return;
    markSpamMutation.mutate(id, {
      onSuccess: () => {
        addToast({
          title: 'Marked as spam',
          description: 'The ticket has been marked as spam.',
          severity: 'success',
        });
        setIsMarkSpamModalOpen(false);
        navigate('/tickets');
      },
      onError: () => {
        addToast({
          title: 'Error',
          description: 'Failed to mark ticket as spam. Please try again.',
          severity: 'danger',
        });
        setIsMarkSpamModalOpen(false);
      },
    });
  }, [id, markSpamMutation, navigate]);

  const handleUnmarkSpam = useCallback(() => {
    if (!id) return;
    unmarkSpamMutation.mutate(id, {
      onSuccess: () => {
        addToast({
          title: 'Spam flag removed',
          description: 'The ticket has been returned to normal ticket views.',
          severity: 'success',
        });
      },
      onError: () => {
        addToast({
          title: 'Error',
          description: 'Failed to unmark spam. Please try again.',
          severity: 'danger',
        });
      },
    });
  }, [id, unmarkSpamMutation]);

  const handleMergeConfirm = useCallback(
    (targetTicketId: string) => {
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
        },
      );
    },
    [id, mergeTicketsMutation, navigate],
  );

  const handleLinkConfirm = useCallback(
    (targetTicketId: string, linkType: string) => {
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
        },
      );
    },
    [id, linkTicketsMutation],
  );

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (!id) return;
      await uploadFiles(files, id, undefined);
    },
    [id, uploadFiles],
  );

  const handleDeleteAttachment = useCallback(
    (attachmentId: string) => {
      deleteAttachmentMutation.mutate(attachmentId);
    },
    [deleteAttachmentMutation],
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
    [id, addTimeEntryMutation],
  );

  const handleDeleteTimeEntry = useCallback(
    (entryId: string) => {
      if (!id) return;
      deleteTimeEntryMutation.mutate({ entryId, ticketId: id });
    },
    [id, deleteTimeEntryMutation],
  );

  // Wave 3 handlers
  const handleDuplicateConfirm = useCallback(() => {
    if (!id) return;
    duplicateTicketMutation.mutate(id, {
      onSuccess: newTicketId => {
        addToast({
          title: 'Ticket duplicated',
          description: 'Navigating to the new ticket.',
          severity: 'success',
        });
        setIsDuplicateModalOpen(false);
        navigate(`/tickets/${newTicketId}`);
      },
      onError: () => {
        addToast({
          title: 'Error',
          description: 'Failed to duplicate ticket. Please try again.',
          severity: 'danger',
        });
      },
    });
  }, [id, duplicateTicketMutation, navigate]);

  const handleConvertToReplyConfirm = useCallback(
    (parentTicketId: string) => {
      if (!id) return;
      convertToReplyMutation.mutate(
        { ticketId: id, parentTicketId },
        {
          onSuccess: () => {
            addToast({
              title: 'Ticket converted',
              description:
                'Content moved to parent ticket as an internal note.',
              severity: 'success',
            });
            setIsConvertToReplyModalOpen(false);
            navigate(`/tickets/${parentTicketId}`);
          },
          onError: () => {
            addToast({
              title: 'Error',
              description: 'Failed to convert ticket. Please try again.',
              severity: 'danger',
            });
          },
        },
      );
    },
    [id, convertToReplyMutation, navigate],
  );

  const handleAddParentConfirm = useCallback(
    (parentTicketId: string) => {
      if (!id) return;
      setParentMutation.mutate(
        { ticketId: id, parentTicketId },
        {
          onSuccess: () => {
            addToast({
              title: 'Parent set',
              description: 'Parent ticket linked successfully.',
              severity: 'success',
            });
            setIsAddParentModalOpen(false);
          },
          onError: (error: any) => {
            const errorCode = error?.response?.data?.errors?.[0]?.code;
            if (errorCode === 'CIRCULAR_HIERARCHY') {
              addToast({
                title: 'Circular hierarchy',
                description:
                  'Setting this parent would create a circular hierarchy.',
                severity: 'danger',
              });
            } else {
              addToast({
                title: 'Error',
                description: 'Failed to set parent ticket. Please try again.',
                severity: 'danger',
              });
            }
          },
        },
      );
    },
    [id, setParentMutation],
  );

  // Wave 6 handlers
  const handleAddSubtaskSubmit = useCallback(
    (data: { subject: string; description?: string }) => {
      if (!id) return;
      createSubtaskMutation.mutate(
        { parentTicketId: id, data },
        {
          onSuccess: newTicketId => {
            addToast({
              title: 'Subtask created',
              description: 'The subtask has been created successfully.',
              severity: 'success',
            });
            setIsAddSubtaskModalOpen(false);
          },
          onError: () => {
            addToast({
              title: 'Error',
              description: 'Failed to create subtask. Please try again.',
              severity: 'danger',
            });
          },
        },
      );
    },
    [id, createSubtaskMutation],
  );

  const handleToggleProblem = useCallback(() => {
    if (!id || !ticket) return;
    if (ticket.isProblem) {
      unmarkAsProblemMutation.mutate(id, {
        onSuccess: () =>
          addToast({ title: 'Problem flag removed', severity: 'success' }),
        onError: () =>
          addToast({
            title: 'Error removing problem flag',
            severity: 'danger',
          }),
      });
    } else {
      markAsProblemMutation.mutate(id, {
        onSuccess: () =>
          addToast({ title: 'Marked as Problem', severity: 'success' }),
        onError: () =>
          addToast({ title: 'Error marking as problem', severity: 'danger' }),
      });
    }
  }, [id, ticket, markAsProblemMutation, unmarkAsProblemMutation]);

  const handleTogglePublishAsIdea = useCallback(() => {
    if (!id || !ticket) return;
    if (ticket.isPublishedAsIdea) {
      unpublishAsIdeaMutation.mutate(id, {
        onSuccess: () =>
          addToast({ title: 'Removed from Ideas Forum', severity: 'success' }),
        onError: () =>
          addToast({
            title: 'Error removing from Ideas Forum',
            severity: 'danger',
          }),
      });
    } else {
      publishAsIdeaMutation.mutate(id, {
        onSuccess: () =>
          addToast({ title: 'Published to Ideas Forum', severity: 'success' }),
        onError: () =>
          addToast({
            title: 'Error publishing to Ideas Forum',
            severity: 'danger',
          }),
      });
    }
  }, [id, ticket, publishAsIdeaMutation, unpublishAsIdeaMutation]);

  const handleReply = useCallback(() => {
    // Scroll to reply editor
    replyEditorRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
    // Focus the editor after scroll
    setTimeout(() => {
      const editorElement =
        replyEditorRef.current?.querySelector('[contenteditable]');
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
      },
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
      },
    );
  }, [id, updateTicketMutation]);

  if (isLoading) {
    return <PageSpinner />;
  }

  if (error || !ticket) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Icon
            name="exclamation-triangle"
            className="h-12 w-12 text-danger mx-auto mb-4"
          />
          <h2 className="text-xl font-semibold mb-2">Ticket Not Found</h2>
          <p className="text-gray-600 mb-4">
            The ticket you are looking for does not exist.
          </p>
          <BaseButton onPress={handleBack}>Back to Tickets</BaseButton>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(ticket.status as any);
  const priorityConfig = getPriorityConfig(ticket.priority as any);
  const isSubscribeLoading =
    subscribeMutation.isPending || unsubscribeMutation.isPending;

  // State-conflict derived flags — fields are extended on TicketDto until helpdesk-client is regenerated
  const isDeleted = !!ticket.isDeleted;
  const isSpam = !!ticket.isSpam;
  // Tickets that are spam or deleted cannot be moderated further
  const canModerate = !isDeleted && !isSpam;
  // All actions are disabled when ticket is deleted
  const actionsDisabled = isDeleted;

  return (
    <>
      {/* Print stylesheet — hides navigation and sidebar, keeps main content only */}
      <style>{`
        @media print {
          .helpdesk-print-hide { display: none !important; }
          .helpdesk-print-full { grid-column: 1 / -1 !important; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-4 helpdesk-print-hide">
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
          <div className="lg:col-span-2 space-y-6 helpdesk-print-full">
            {/* Deleted banner */}
            {isDeleted && (
              <div className="bg-danger-50 border border-danger-200 rounded-lg px-4 py-3 mb-2 flex items-center gap-2">
                <Icon name="trash" className="h-4 w-4 text-danger" />
                <span className="text-sm font-medium text-danger">
                  This ticket is deleted.
                </span>
              </div>
            )}

            {/* Header */}
            <Box title={`Ticket #${ticket.id?.substring(0, 8)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
                    <StatusBadge color={statusConfig.color}>
                      {statusConfig.label}
                    </StatusBadge>
                    <StatusBadge color={priorityConfig.color}>
                      {priorityConfig.label}
                    </StatusBadge>
                    {isSpam && <StatusBadge color="warning">Spam</StatusBadge>}
                    {ticket.isProblem && (
                      <StatusBadge color="danger">Problem</StatusBadge>
                    )}
                    {ticket.isPublishedAsIdea && (
                      <StatusBadge color="success">
                        Published to Ideas Forum
                      </StatusBadge>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 helpdesk-print-hide">
                  {/* AI Assistant */}
                  <PermissionGuard
                    requiredPermissions={[HelpdeskPermissions.TicketWrite]}
                    fallback={null}
                  >
                    <BaseButton
                      variant="bordered"
                      onPress={handleAiAssistant}
                      isDisabled={actionsDisabled}
                      icon={<Icon name="flash" className="h-4 w-4" />}
                    >
                      AI Assistant
                    </BaseButton>
                  </PermissionGuard>
                  <PermissionGuard
                    requiredPermissions={[HelpdeskPermissions.TicketWrite]}
                    fallback={null}
                  >
                    <Dropdown>
                      <DropdownTrigger>
                        <BaseButton
                          variant="bordered"
                          icon={<Icon name="dotsV" className="h-4 w-4" />}
                        />
                      </DropdownTrigger>
                      <DropdownMenu
                        aria-label="Ticket actions"
                        disabledKeys={
                          actionsDisabled
                            ? [
                                'edit',
                                'print',
                                'summary',
                                'subtask',
                                'parent',
                                'convert',
                                'link-asset',
                                'duplicate',
                                'forward',
                                'spam',
                                'unspam',
                                'problem',
                                'publish',
                              ]
                            : []
                        }
                      >
                        {/* Edit & View */}
                        <DropdownSection title="Edit & View" showDivider>
                          <DropdownItem
                            key="edit"
                            onPress={() => setIsEditModalOpen(true)}
                          >
                            Edit
                          </DropdownItem>
                          <DropdownItem key="print" onPress={handlePrint}>
                            Print
                          </DropdownItem>
                          <DropdownItem
                            key="systemlog"
                            onPress={handleToggleSystemLog}
                          >
                            {showSystemLog
                              ? 'Hide System Log'
                              : 'Show System Log'}
                          </DropdownItem>
                          <DropdownItem
                            key="summary"
                            onPress={() => handleComingSoon('Ticket Summary')}
                          >
                            Ticket Summary
                          </DropdownItem>
                        </DropdownSection>

                        {/* Relate */}
                        <DropdownSection title="Relate" showDivider>
                          <DropdownItem
                            key="subtask"
                            onPress={() => setIsAddSubtaskModalOpen(true)}
                          >
                            Add Subtask
                          </DropdownItem>
                          <DropdownItem
                            key="parent"
                            onPress={() => setIsAddParentModalOpen(true)}
                          >
                            Add Parent
                          </DropdownItem>
                          <DropdownItem
                            key="convert"
                            onPress={() => setIsConvertToReplyModalOpen(true)}
                            description="Merges this ticket into another as a comment"
                          >
                            Convert to Reply
                          </DropdownItem>
                          <DropdownItem
                            key="link-asset"
                            onPress={() => handleComingSoon('Link Asset')}
                          >
                            Link Asset
                          </DropdownItem>
                          <DropdownItem
                            key="duplicate"
                            onPress={() => setIsDuplicateModalOpen(true)}
                          >
                            Duplicate
                          </DropdownItem>
                        </DropdownSection>

                        {/* Lifecycle */}
                        <DropdownSection title="Lifecycle" showDivider>
                          <DropdownItem
                            key="forward"
                            onPress={() => setIsForwardModalOpen(true)}
                          >
                            Forward by Email
                          </DropdownItem>
                          {canModerate ? (
                            <DropdownItem
                              key="problem"
                              onPress={handleToggleProblem}
                              isDisabled={
                                markAsProblemMutation.isPending ||
                                unmarkAsProblemMutation.isPending
                              }
                            >
                              {ticket?.isProblem
                                ? 'Unmark as Problem'
                                : 'Mark as Problem'}
                            </DropdownItem>
                          ) : (
                            <DropdownItem key="problem" isDisabled>
                              {ticket?.isProblem
                                ? 'Unmark as Problem'
                                : 'Mark as Problem'}
                            </DropdownItem>
                          )}
                          {canModerate ? (
                            <DropdownItem
                              key="publish"
                              onPress={handleTogglePublishAsIdea}
                              isDisabled={
                                publishAsIdeaMutation.isPending ||
                                unpublishAsIdeaMutation.isPending
                              }
                            >
                              {ticket?.isPublishedAsIdea
                                ? 'Remove from Ideas Forum'
                                : 'Publish to Ideas Forum'}
                            </DropdownItem>
                          ) : (
                            <DropdownItem key="publish" isDisabled>
                              {ticket?.isPublishedAsIdea
                                ? 'Remove from Ideas Forum'
                                : 'Publish to Ideas Forum'}
                            </DropdownItem>
                          )}
                          <DropdownItem
                            key="spam"
                            onPress={
                              isSpam
                                ? handleUnmarkSpam
                                : () => setIsMarkSpamModalOpen(true)
                            }
                          >
                            {isSpam ? 'Unmark as Spam' : 'Mark as Spam'}
                          </DropdownItem>
                        </DropdownSection>

                        {/* Danger Zone */}
                        <DropdownSection title="Danger Zone">
                          <DropdownItem
                            key="delete"
                            className="text-danger"
                            color="danger"
                            onPress={() => setIsDeleteModalOpen(true)}
                          >
                            Delete
                          </DropdownItem>
                        </DropdownSection>
                      </DropdownMenu>
                    </Dropdown>
                  </PermissionGuard>
                </div>
              </div>
            </Box>

            {/* Action Button Row */}
            <Box>
              <div className="flex items-center gap-3 helpdesk-print-hide">
                <PermissionGuard
                  requiredPermissions={[HelpdeskPermissions.TicketWrite]}
                  fallback={null}
                >
                  <BaseButton
                    onPress={() => setIsNewTicketModalOpen(true)}
                    icon={<Icon name="plus" className="h-4 w-4" />}
                  >
                    New Ticket
                  </BaseButton>
                </PermissionGuard>
                <PermissionGuard
                  requiredPermissions={[HelpdeskPermissions.TicketWrite]}
                  fallback={null}
                >
                  <BaseButton
                    color="primary"
                    onPress={handleReply}
                    isDisabled={actionsDisabled}
                    icon={<Icon name="chat-bubble-left" className="h-4 w-4" />}
                  >
                    Reply
                  </BaseButton>
                </PermissionGuard>
                <PermissionGuard
                  requiredPermissions={[HelpdeskPermissions.TicketAssign]}
                  fallback={null}
                >
                  <BaseButton
                    variant="bordered"
                    onPress={handleTakeover}
                    icon={<Icon name="user-plus" className="h-4 w-4" />}
                    isDisabled={
                      actionsDisabled || ticket.assigneeId === currentUserId
                    }
                  >
                    Takeover
                  </BaseButton>
                </PermissionGuard>
                <PermissionGuard
                  requiredPermissions={[HelpdeskPermissions.TicketWrite]}
                  fallback={null}
                >
                  <BaseButton
                    variant="bordered"
                    onPress={handleCloseTicket}
                    icon={<Icon name="check-circle" className="h-4 w-4" />}
                    isDisabled={
                      actionsDisabled || ticket.status === TicketStatus.Closed
                    }
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
              <div className="flex items-center justify-end mb-4 helpdesk-print-hide">
                <BaseButton
                  size="sm"
                  variant="light"
                  onPress={() => setShowAttachments(!showAttachments)}
                  icon={
                    <Icon
                      name={showAttachments ? 'chevron-up' : 'chevron-down'}
                      className="h-4 w-4"
                    />
                  }
                >
                  {showAttachments ? 'Hide' : 'Show'}
                </BaseButton>
              </div>

              {showAttachments && (
                <div className="space-y-4">
                  <PermissionGuard
                    requiredPermissions={[HelpdeskPermissions.TicketWrite]}
                  >
                    <FileUploadZone
                      onFilesSelected={handleFilesSelected}
                      progress={uploadProgress}
                    />
                  </PermissionGuard>

                  {attachmentsLoading ? (
                    <div className="text-center py-4">
                      Loading attachments...
                    </div>
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
                <div className="flex justify-end helpdesk-print-hide">
                  <BaseButton
                    size="sm"
                    variant="light"
                    onPress={handleToggleSystemLog}
                    icon={
                      <Icon
                        name={showSystemLog ? 'eye-slash' : 'eye'}
                        className="h-4 w-4"
                      />
                    }
                  >
                    {showSystemLog ? 'Hide System Log' : 'Show System Log'}
                  </BaseButton>
                </div>
                <CommentThread
                  comments={visibleComments}
                  isLoading={commentsLoading}
                />
                <div ref={replyEditorRef} className="helpdesk-print-hide">
                  <ReplyEditor
                    ticketId={id ?? ''}
                    categoryId={ticket.categoryId ?? undefined}
                  />
                </div>
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
                      by {ticket.requesterName ?? 'Unknown'} on{' '}
                      {formatDateTime(ticket.createdAt, { timezone })}
                    </p>
                  </div>
                </div>
                {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Icon name="pencil" className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Ticket updated</p>
                      <p className="text-xs text-gray-500">
                        on {formatDateTime(ticket.updatedAt, { timezone })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Box>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6 helpdesk-print-hide">
            {/* Ticket Info */}
            <Box title="Ticket Details">
              <TicketDetailSidebar
                ticket={ticket as any}
                onUpdate={handleUpdate}
                isUpdating={updateTicketMutation.isPending}
                isSubscribed={isSubscribed}
                isSubscribeLoading={isSubscribeLoading}
                onSubscribeToggle={handleSubscribeToggle}
              />
            </Box>

            {/* SLA Indicator */}
            {slaData && <SlaIndicator slaData={slaData} variant="full" />}

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
            <CSATWidget
              ticketId={id ?? ''}
              ticketStatus={ticket.status as any}
            />

            {/* Child Tickets */}
            {children && children.length > 0 && (
              <Box title="Child Tickets">
                <div className="space-y-2">
                  {children.map((child: any) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <BaseButton
                        variant="link"
                        size="sm"
                        className="font-mono text-xs p-0 h-auto min-h-0"
                        onPress={() => navigate(`/tickets/${child.id}`)}
                      >
                        #{child.id?.substring(0, 8)}
                      </BaseButton>
                      <span className="text-gray-600 truncate ml-2 flex-1">
                        {child.subject}
                      </span>
                    </div>
                  ))}
                </div>
              </Box>
            )}
          </div>
        </div>

        {/* Wave 3 Modals */}
        <EditTicketModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          ticketId={id ?? ''}
          initialSubject={ticket.subject ?? ''}
          initialDescription={ticket.description}
        />
        <ForwardTicketModal
          isOpen={isForwardModalOpen}
          onClose={() => setIsForwardModalOpen(false)}
          ticketId={id ?? ''}
          defaultSubject={`Fwd: ${ticket.subject ?? ''}`}
        />
        <DuplicateTicketModal
          isOpen={isDuplicateModalOpen}
          onClose={() => setIsDuplicateModalOpen(false)}
          onConfirm={handleDuplicateConfirm}
          isLoading={duplicateTicketMutation.isPending}
        />
        <ConvertToReplyModal
          isOpen={isConvertToReplyModalOpen}
          onClose={() => setIsConvertToReplyModalOpen(false)}
          onConfirm={handleConvertToReplyConfirm}
          isLoading={convertToReplyMutation.isPending}
          currentTicketId={id ?? ''}
        />
        <AddParentTicketModal
          isOpen={isAddParentModalOpen}
          onClose={() => setIsAddParentModalOpen(false)}
          onConfirm={handleAddParentConfirm}
          isLoading={setParentMutation.isPending}
          currentTicketId={id ?? ''}
        />
        <AddSubtaskModal
          isOpen={isAddSubtaskModalOpen}
          parentTicketId={id ?? ''}
          onClose={() => setIsAddSubtaskModalOpen(false)}
          onSubmit={handleAddSubtaskSubmit}
          isLoading={createSubtaskMutation.isPending}
        />

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
          ticketId={id ?? ''}
        />
        <NewTicketModal
          isOpen={isNewTicketModalOpen}
          onClose={() => setIsNewTicketModalOpen(false)}
          onCreated={ticketId => navigate(`/tickets/${ticketId}`)}
        />
        <DeleteTicketModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          isLoading={deleteTicketMutation.isPending}
        />
        <MarkSpamModal
          isOpen={isMarkSpamModalOpen}
          onClose={() => setIsMarkSpamModalOpen(false)}
          onConfirm={handleMarkSpamConfirm}
          isLoading={markSpamMutation.isPending}
        />
      </div>
    </>
  );
};
