import {
  HelpdeskDomainApprovalsEnumsApprovalDecisionType as ApprovalDecisionType,
  HelpdeskDomainApprovalsEnumsApprovalState as ApprovalState,
} from '@/api/helpdesk-client';
import { ModalHeader, StatusBadge } from '@/components/shared';
import { HelpdeskPermissions } from '@/constants/permissions';
import {
  BaseButton,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseTextarea,
  Icon,
} from '@brainforgeau/components';
import { Box } from '@brainforgeau/components/base';
import { useConfirm } from '@brainforgeau/components/page';
import { formatDateTime } from '@brainforgeau/components/utils';
import { PermissionGuard, useTimezone } from '@brainforgeau/security';
import { type FC, useCallback, useState } from 'react';
import {
  useCancelApproval,
  useMakeApprovalDecision,
  useRequestApproval,
  useTicketApproval,
} from '../hooks';

interface TicketApprovalPanelProps {
  ticketId: string;
}

export const TicketApprovalPanel: FC<TicketApprovalPanelProps> = ({
  ticketId,
}) => {
  const timezone = useTimezone();
  const { data: approval, isLoading } = useTicketApproval(ticketId);
  const requestApprovalMutation = useRequestApproval();
  const makeDecisionMutation = useMakeApprovalDecision();
  const cancelApprovalMutation = useCancelApproval();
  const { confirm, dialog } = useConfirm();

  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string>('');
  const [decision, setDecision] = useState<ApprovalDecisionType>(
    ApprovalDecisionType.Approved,
  );
  const [comment, setComment] = useState('');

  // REVIEW: The generated ApprovalWorkflowsApi has no tenant-scoped list
  // endpoint (create-only — see useApprovalWorkflows.ts), so there is no way
  // to offer a workflow picker here. RequestApprovalCommand.workflowId is
  // optional; omitting it lets the backend auto-resolve the applicable
  // workflow for the ticket's category.
  const handleRequestApproval = useCallback(() => {
    requestApprovalMutation.mutate({ ticketId });
  }, [ticketId, requestApprovalMutation]);

  const handleMakeDecision = useCallback(() => {
    if (!approval?.id || !selectedStepId) return;
    makeDecisionMutation.mutate(
      {
        approvalId: approval.id,
        stepId: selectedStepId,
        decision,
        comment: comment || undefined,
      },
      {
        onSuccess: () => {
          setShowDecisionModal(false);
          setSelectedStepId('');
          setComment('');
        },
      },
    );
  }, [approval, selectedStepId, decision, comment, makeDecisionMutation]);

  const handleCancelApproval = useCallback(async () => {
    if (!approval?.id) return;
    const ok = await confirm({
      title: 'Cancel Approval',
      body: 'Are you sure you want to cancel this approval? This cannot be undone.',
      confirmLabel: 'Cancel Approval',
      destructive: true,
    });
    if (!ok) return;
    cancelApprovalMutation.mutate(approval.id);
  }, [approval, confirm, cancelApprovalMutation]);

  const getStateChipColor = (state?: ApprovalState) => {
    switch (state) {
      case ApprovalState.Pending:
        return 'warning';
      case ApprovalState.Approved:
        return 'success';
      case ApprovalState.Rejected:
        return 'danger';
      case ApprovalState.Cancelled:
        return 'default';
      default:
        return 'default';
    }
  };

  const getDecisionChipColor = (decisionType?: ApprovalDecisionType) => {
    switch (decisionType) {
      case ApprovalDecisionType.Pending:
        return 'warning';
      case ApprovalDecisionType.Approved:
        return 'success';
      case ApprovalDecisionType.Rejected:
        return 'danger';
      case ApprovalDecisionType.Skipped:
        return 'default';
      default:
        return 'default';
    }
  };

  const getDecisionLabel = (decisionType?: ApprovalDecisionType): string => {
    switch (decisionType) {
      case ApprovalDecisionType.Pending:
        return 'Pending';
      case ApprovalDecisionType.Approved:
        return 'Approved';
      case ApprovalDecisionType.Rejected:
        return 'Rejected';
      case ApprovalDecisionType.Skipped:
        return 'Skipped';
      default:
        return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <Box title="Approval">
        <div className="text-center py-4">Loading approval status...</div>
      </Box>
    );
  }

  if (!approval) {
    return (
      <Box title="Approval">
        <div className="flex items-center justify-between mb-3">
          <PermissionGuard
            requiredPermissions={[HelpdeskPermissions.ApprovalsRequest]}
            fallback={null}
          >
            <BaseButton
              size="sm"
              color="primary"
              onPress={handleRequestApproval}
              isDisabled={requestApprovalMutation.isPending}
              icon={<Icon name="check-circle" className="h-3.5 w-3.5" />}
            >
              Request Approval
            </BaseButton>
          </PermissionGuard>
        </div>
        <p className="text-sm text-default-500">
          No approval requested for this ticket
        </p>
      </Box>
    );
  }

  return (
    <>
      <Box title="Approval Status">
        <div className="flex items-center justify-end mb-4">
          <StatusBadge color={getStateChipColor(approval.overallState)}>
            {approval.overallState ?? 'Unknown'}
          </StatusBadge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-default-600">Workflow:</span>
            <span className="font-medium">{approval.workflowName}</span>
          </div>
          {approval.requestedAt && (
            <div className="flex justify-between">
              <span className="text-default-600">Requested at:</span>
              <span className="font-medium">
                {formatDateTime(approval.requestedAt, { timezone })}
              </span>
            </div>
          )}
          {approval.completedAt && (
            <div className="flex justify-between">
              <span className="text-default-600">Completed at:</span>
              <span className="font-medium">
                {formatDateTime(approval.completedAt, { timezone })}
              </span>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Steps</h4>
          <div className="space-y-2">
            {(approval.decisions ?? []).map((decisionItem, index) => {
              const canDecide =
                decisionItem.decision === ApprovalDecisionType.Pending &&
                approval.overallState === ApprovalState.Pending;

              return (
                <div
                  key={decisionItem.id ?? index}
                  className="flex items-center justify-between p-3 bg-default-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-white rounded-full border-2">
                      <span className="text-xs font-medium">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {decisionItem.stepName}
                      </p>
                      {decisionItem.comment && (
                        <p className="text-xs text-default-600 mt-1">
                          {decisionItem.comment}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      color={getDecisionChipColor(decisionItem.decision)}
                    >
                      {getDecisionLabel(decisionItem.decision)}
                    </StatusBadge>
                    {canDecide && (
                      <PermissionGuard
                        requiredPermissions={[
                          HelpdeskPermissions.ApprovalsDecide,
                        ]}
                        fallback={null}
                      >
                        <BaseButton
                          size="sm"
                          variant="bordered"
                          color="light"
                          onPress={() => {
                            setSelectedStepId(decisionItem.stepId ?? '');
                            setDecision(ApprovalDecisionType.Approved);
                            setShowDecisionModal(true);
                          }}
                        >
                          Decide
                        </BaseButton>
                      </PermissionGuard>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {approval.overallState === ApprovalState.Pending && (
          <PermissionGuard
            requiredPermissions={[HelpdeskPermissions.ApprovalsRequest]}
            fallback={null}
          >
            <div className="border-t pt-4">
              <BaseButton
                size="sm"
                variant="light"
                color="danger"
                onPress={handleCancelApproval}
                icon={<Icon name="x-circle" className="h-3.5 w-3.5" />}
              >
                Cancel Approval
              </BaseButton>
            </div>
          </PermissionGuard>
        )}
      </Box>

      {/* Decision Modal */}
      <BaseModal
        isOpen={showDecisionModal}
        onClose={() => setShowDecisionModal(false)}
      >
        <BaseModalContent>
          <ModalHeader>Make Decision</ModalHeader>
          <BaseModalBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Decision
                </label>
                <div className="flex gap-3">
                  <BaseButton
                    color="success"
                    onPress={() => setDecision(ApprovalDecisionType.Approved)}
                    className={
                      decision === ApprovalDecisionType.Approved
                        ? 'opacity-100'
                        : 'opacity-50'
                    }
                  >
                    Approve
                  </BaseButton>
                  <BaseButton
                    color="danger"
                    onPress={() => setDecision(ApprovalDecisionType.Rejected)}
                    className={
                      decision === ApprovalDecisionType.Rejected
                        ? 'opacity-100'
                        : 'opacity-50'
                    }
                  >
                    Reject
                  </BaseButton>
                </div>
              </div>

              <BaseTextarea
                label="Comment (optional)"
                value={comment}
                onValueChange={v => setComment(v || '')}
                placeholder="Add a comment about your decision..."
                minRows={3}
              />
            </div>
          </BaseModalBody>
          <BaseModalFooter>
            <BaseButton
              variant="bordered"
              color="light"
              onPress={() => setShowDecisionModal(false)}
            >
              Cancel
            </BaseButton>
            <BaseButton
              color="primary"
              onPress={handleMakeDecision}
              isDisabled={makeDecisionMutation.isPending}
            >
              Submit Decision
            </BaseButton>
          </BaseModalFooter>
        </BaseModalContent>
      </BaseModal>

      {dialog}
    </>
  );
};
