import { type FC, useState, useCallback } from 'react';
import { BaseButton, Icon, BaseTextarea } from '@brainforgeau/components';
import { Box } from '@brainforgeau/components/base';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { StatusBadge } from '@/components/shared';
import { PermissionGuard } from '@brainforgeau/security';
import {
  useTicketApproval,
  useRequestApproval,
  useMakeApprovalDecision,
  useCancelApproval,
  useApprovalWorkflows,
} from '../hooks';
import {
  ApprovalState,
  ApprovalDecisionType,
  ApprovalMode,
  type TicketApprovalDto,
} from '@/types/approval';
import { HelpdeskPermissions } from '@/constants/permissions';

// REVIEW: Component integrates into existing ticket detail view

interface TicketApprovalPanelProps {
  ticketId: string;
}

export const TicketApprovalPanel: FC<TicketApprovalPanelProps> = ({ ticketId }) => {
  const { data: approval, isLoading } = useTicketApproval(ticketId);
  const { items: workflows } = useApprovalWorkflows();
  const requestApprovalMutation = useRequestApproval();
  const makeDecisionMutation = useMakeApprovalDecision();
  const cancelApprovalMutation = useCancelApproval();

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [selectedStepId, setSelectedStepId] = useState<string>('');
  const [decision, setDecision] = useState<ApprovalDecisionType>(ApprovalDecisionType.Approved);
  const [comment, setComment] = useState('');

  const handleRequestApproval = useCallback(() => {
    if (!selectedWorkflowId) return;
    requestApprovalMutation.mutate(
      { ticketId, workflowId: selectedWorkflowId },
      {
        onSuccess: () => {
          setShowRequestModal(false);
          setSelectedWorkflowId('');
        },
      }
    );
  }, [ticketId, selectedWorkflowId, requestApprovalMutation]);

  const handleMakeDecision = useCallback(() => {
    if (!approval || !selectedStepId) return;
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
      }
    );
  }, [approval, selectedStepId, decision, comment, makeDecisionMutation]);

  const handleCancelApproval = useCallback(() => {
    if (!approval) return;
    if (confirm('Are you sure you want to cancel this approval?')) {
      cancelApprovalMutation.mutate(approval.id);
    }
  }, [approval, cancelApprovalMutation]);

  const getStateChipColor = (state: ApprovalState) => {
    switch (state) {
      case ApprovalState.Pending:
        return 'warning';
      case ApprovalState.Approved:
        return 'success';
      case ApprovalState.Rejected:
        return 'danger';
      case ApprovalState.Cancelled:
        return 'default';
    }
  };

  const getDecisionChipColor = (decisionType: ApprovalDecisionType) => {
    switch (decisionType) {
      case ApprovalDecisionType.Pending:
        return 'warning';
      case ApprovalDecisionType.Approved:
        return 'success';
      case ApprovalDecisionType.Rejected:
        return 'danger';
      case ApprovalDecisionType.Skipped:
        return 'default';
    }
  };

  const getDecisionLabel = (decisionType: ApprovalDecisionType) => {
    switch (decisionType) {
      case ApprovalDecisionType.Pending:
        return 'Pending';
      case ApprovalDecisionType.Approved:
        return 'Approved';
      case ApprovalDecisionType.Rejected:
        return 'Rejected';
      case ApprovalDecisionType.Skipped:
        return 'Skipped';
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
      <>
        <Box title="Approval">
          <div className="flex items-center justify-between mb-3">
            <PermissionGuard requiredPermissions={[HelpdeskPermissions.ApprovalsRequest]} fallback={null}>
              <BaseButton
                size="sm"
                color="primary"
                onPress={() => setShowRequestModal(true)}
                icon={<Icon name="check-circle" className="h-3.5 w-3.5" />}
              >
                Request Approval
              </BaseButton>
            </PermissionGuard>
          </div>
          <p className="text-sm text-gray-500">No approval requested for this ticket</p>
        </Box>

        {/* Request Approval Modal */}
        <Modal isOpen={showRequestModal} onClose={() => setShowRequestModal(false)}>
          <ModalContent>
            <ModalHeader>Request Approval</ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Select a workflow to request approval for this ticket.
                </p>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={selectedWorkflowId}
                  onChange={(e) => setSelectedWorkflowId(e.target.value)}
                >
                  <option value="">Select workflow...</option>
                  {workflows
                    .filter((w) => w.isActive)
                    .map((workflow) => (
                      <option key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </option>
                    ))}
                </select>
              </div>
            </ModalBody>
            <ModalFooter>
              <BaseButton variant="bordered" onPress={() => setShowRequestModal(false)}>
                Cancel
              </BaseButton>
              <BaseButton
                color="primary"
                onPress={handleRequestApproval}
                isDisabled={!selectedWorkflowId}
                isLoading={requestApprovalMutation.isPending}
              >
                Request
              </BaseButton>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </>
    );
  }

  return (
    <>
      <Box title="Approval Status">
          <div className="flex items-center justify-end mb-4">
            <StatusBadge color={getStateChipColor(approval.overallState)}>
              {ApprovalState[approval.overallState]}
            </StatusBadge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Workflow:</span>
              <span className="font-medium">{approval.workflowName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Requested by:</span>
              <span className="font-medium">{approval.requestedByUserName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Requested at:</span>
              <span className="font-medium">
                {new Date(approval.requestedAt).toLocaleString()}
              </span>
            </div>
            {approval.completedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Completed at:</span>
                <span className="font-medium">
                  {new Date(approval.completedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Steps</h4>
            <div className="space-y-2">
              {approval.decisions.map((decisionItem, index) => {
                const canDecide =
                  decisionItem.decision === ApprovalDecisionType.Pending &&
                  approval.overallState === ApprovalState.Pending;

                return (
                  <div
                    key={decisionItem.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 bg-white rounded-full border-2">
                        <span className="text-xs font-medium">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{decisionItem.stepName}</p>
                        {decisionItem.approverUserName && (
                          <p className="text-xs text-gray-500">
                            {decisionItem.approverUserName}
                          </p>
                        )}
                        {decisionItem.comment && (
                          <p className="text-xs text-gray-600 mt-1">{decisionItem.comment}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge color={getDecisionChipColor(decisionItem.decision)}>
                        {getDecisionLabel(decisionItem.decision)}
                      </StatusBadge>
                      {canDecide && (
                        <PermissionGuard
                          requiredPermissions={[HelpdeskPermissions.ApprovalsDecide]}
                          fallback={null}
                        >
                          <BaseButton
                            size="sm"
                            variant="bordered"
                            onPress={() => {
                              setSelectedStepId(decisionItem.stepId);
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
            <PermissionGuard requiredPermissions={[HelpdeskPermissions.ApprovalsRequest]} fallback={null}>
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
      <Modal isOpen={showDecisionModal} onClose={() => setShowDecisionModal(false)}>
        <ModalContent>
          <ModalHeader>Make Decision</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Decision</label>
                <div className="flex gap-3">
                  <BaseButton
                    color="success"
                    onPress={() => setDecision(ApprovalDecisionType.Approved)}
                    className={decision === ApprovalDecisionType.Approved ? 'opacity-100' : 'opacity-50'}
                  >
                    Approve
                  </BaseButton>
                  <BaseButton
                    color="danger"
                    onPress={() => setDecision(ApprovalDecisionType.Rejected)}
                    className={decision === ApprovalDecisionType.Rejected ? 'opacity-100' : 'opacity-50'}
                  >
                    Reject
                  </BaseButton>
                </div>
              </div>

              <BaseTextarea
                label="Comment (optional)"
                value={comment}
                onValueChange={(value) => setComment(value || '')}
                placeholder="Add a comment about your decision..."
                minRows={3}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <BaseButton variant="bordered" onPress={() => setShowDecisionModal(false)}>
              Cancel
            </BaseButton>
            <BaseButton
              color="primary"
              onPress={handleMakeDecision}
              isLoading={makeDecisionMutation.isPending}
            >
              Submit Decision
            </BaseButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
