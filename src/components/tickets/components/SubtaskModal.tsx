import { ModalHeader, StatusBadge } from '@/components/shared';
import { HelpdeskPermissions } from '@/constants/permissions';
import { type TicketPriority, TicketStatus } from '@/types/ticket';
import {
  BaseButton,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
} from '@brainforgeau/components';
import { PermissionGuard } from '@brainforgeau/security';
import { useNavigate } from '@modern-js/runtime/router';
import DOMPurify from 'dompurify';
import type { FC } from 'react';
import { useTicketDetail, useUpdateTicket } from '../hooks/useTickets';
import { getPriorityConfig } from '../ticket-priority-config';
import { getStatusConfig } from '../ticket-status-config';

interface SubtaskModalProps {
  isOpen: boolean;
  /** Empty while closed; the fetch is gated on it. */
  subtaskId: string;
  onClose: () => void;
}

/**
 * A subtask, read and progressed without leaving the ticket that owns it.
 *
 * WHY NOT NAVIGATE
 * A subtask is a step in the work you are already looking at. Opening it as a
 * page discarded that context and made "tick this off and carry on" a
 * three-navigation round trip, which is the whole reason subtasks felt like
 * separate tickets rather than part of one.
 *
 * WHY NOT THE WHOLE TICKET VIEW IN A DIALOG
 * TicketDetail takes a ticketId and would render here, but it carries its own
 * action menu, its own dozen modals and its own subtask list, so a subtask
 * could open a subtask. This shows what a subtask is for — what it says, where
 * it is up to, who holds it — and hands off to the full page for anything more.
 */
export const SubtaskModal: FC<SubtaskModalProps> = ({
  isOpen,
  subtaskId,
  onClose,
}) => {
  const navigate = useNavigate();
  const { data: subtask, isLoading } = useTicketDetail(subtaskId);
  const updateTicketMutation = useUpdateTicket();

  const statusConfig = getStatusConfig(subtask?.status as TicketStatus);
  const priorityConfig = getPriorityConfig(subtask?.priority as TicketPriority);

  const isClosed = subtask?.status === TicketStatus.Closed;

  const toggleClosed = () => {
    if (!subtaskId) return;
    updateTicketMutation.mutate({
      id: subtaskId,
      updates: {
        status: isClosed ? TicketStatus.InProgress : TicketStatus.Closed,
      },
    });
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="2xl">
      <BaseModalContent>
        <ModalHeader>{subtask?.subject ?? 'Subtask'}</ModalHeader>
        <BaseModalBody>
          {isLoading || !subtask ? (
            <p className="text-sm text-default-400">Loading…</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge color={statusConfig.color}>
                  {statusConfig.label}
                </StatusBadge>
                <StatusBadge color={priorityConfig.color}>
                  {priorityConfig.label}
                </StatusBadge>
                <span className="text-sm text-default-500">
                  {subtask.assigneeName ?? 'Unassigned'}
                </span>
              </div>

              <div>
                <span className="mb-1 block text-xs font-medium text-default-500">
                  Description
                </span>
                {subtask.description ? (
                  <div
                    className="prose max-w-none text-sm"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitised on this same line. Subtask descriptions are untrusted, same as ticket descriptions, and the backend sanitiser covers knowledge-base articles only.
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(subtask.description),
                    }}
                  />
                ) : (
                  <p className="text-sm text-default-400 italic">
                    No description yet.
                  </p>
                )}
              </div>
            </div>
          )}
        </BaseModalBody>
        <BaseModalFooter>
          {/*
            Opening the full ticket is the escape hatch, not the default. It
            keeps comments, attachments and the rest reachable without this
            dialog having to grow into a second copy of the ticket page.
          */}
          <BaseButton
            variant="link"
            className="mr-auto p-0"
            onPress={() => navigate(`/tickets/${subtaskId}`)}
          >
            Open full ticket
          </BaseButton>
          <PermissionGuard
            requiredPermissions={[HelpdeskPermissions.TicketWrite]}
            fallback={null}
          >
            <BaseButton
              variant="bordered"
              isDisabled={updateTicketMutation.isPending || !subtask}
              onPress={toggleClosed}
            >
              {isClosed ? 'Reopen' : 'Mark as Closed'}
            </BaseButton>
          </PermissionGuard>
          <BaseButton color="primary" onPress={onClose}>
            Close
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
