import { type FC, useCallback, useState } from 'react';
import { useNavigate, useParams } from '@modern-js/runtime/router';
import { BaseButton, Icon } from '@brainforgeau/components';
import { PermissionGuard } from '@brainforgeau/security';
import { Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { useTicketDetail, useUpdateTicket } from '../hooks/useTickets';
import { TicketDetailSidebar } from './TicketDetailSidebar';
import { FileUploadZone } from '@/components/file-upload/FileUploadZone';
import { AttachmentList } from '@/components/file-upload/AttachmentList';
import { SlaIndicator } from '@/components/sla/SlaIndicator';
import { TimeTracker } from '@/components/sla/TimeTracker';
import { useAttachments, useUploadAttachment, useDeleteAttachment } from '@/components/attachments/hooks/useAttachments';
import { useSla } from '@/components/sla/hooks/useSla';
import { useTimeTracking, useStartTimer, useStopTimer, usePauseTimer, useAddTimeEntry, useDeleteTimeEntry } from '@/components/sla/hooks/useTimeTracking';
import { HelpdeskPermissions } from '@/constants/permissions';
import { TicketStatus, TicketPriority } from '@/types/ticket';

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
  const { data: ticket, isLoading, error } = useTicketDetail(id ?? '');
  const updateTicketMutation = useUpdateTicket();

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

  const [showAttachments, setShowAttachments] = useState(false);

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
    // TODO: Implement merge functionality in Phase 2
    console.log('Merge ticket:', id);
  }, [id]);

  const handleLink = useCallback(() => {
    // TODO: Implement link functionality in Phase 2
    console.log('Link ticket:', id);
  }, [id]);

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
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
                  <Chip color={statusConfig.color} variant="flat" size="sm">
                    {statusConfig.label}
                  </Chip>
                  <Chip color={priorityConfig.color} variant="flat" size="sm">
                    {priorityConfig.label}
                  </Chip>
                </div>
                <p className="text-sm text-gray-500">Ticket #{ticket.id?.substring(0, 8)}</p>
              </div>

              {/* Actions Dropdown */}
              <PermissionGuard requiredPermissions={[HelpdeskPermissions.TicketWrite]} fallback={null}>
                <Dropdown>
                  <DropdownTrigger>
                    <BaseButton
                      variant="bordered"
                      icon={<Icon name="ellipsis-vertical" className="h-4 w-4" />}
                    >
                      Actions
                    </BaseButton>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="Ticket actions">
                    <DropdownItem key="merge" onPress={handleMerge}>
                      Merge Ticket
                    </DropdownItem>
                    <DropdownItem key="link" onPress={handleLink}>
                      Link Ticket
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </PermissionGuard>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Description</h2>
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Attachments</h2>
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
          </div>

          {/* Comment Thread - Placeholder for Phase 2 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Comments</h2>
            <div className="text-center py-8 text-gray-500">
              <Icon name="chat-bubble-left-right" className="h-12 w-12 mx-auto mb-2" />
              <p>Comment thread will be implemented in Phase 2</p>
            </div>
          </div>

          {/* Activity Timeline - Placeholder */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Activity Timeline</h2>
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
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Ticket Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <TicketDetailSidebar
              ticket={ticket}
              onUpdate={handleUpdate}
              isUpdating={updateTicketMutation.isPending}
            />
          </div>

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
        </div>
      </div>
    </div>
  );
};
