import { useCallback } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { useNavigate } from '@modern-js/runtime/router';
import { BaseButton, Icon } from '@brainforgeau/components';
import { Card, CardBody } from '@heroui/react';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import { StatusBadge } from '@/components/shared';
import { usePendingApprovals } from '@/components/approvals';

// REVIEW: Dashboard showing pending approvals for current user

function PendingApprovalsPage() {
  const navigate = useNavigate();
  const timezone = useTimezone();
  const { items, isLoading, refetch } = usePendingApprovals();

  const handleViewTicket = useCallback(
    (ticketId: string) => {
      navigate(`/tickets/${ticketId}`);
    },
    [navigate]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Pending Approvals</title>
      </Helmet>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold">Pending Approvals</h1>
          <BaseButton
            size="sm"
            variant="light"
            onPress={() => refetch()}
            icon={<Icon name="arrow-path" className="h-3.5 w-3.5" />}
          >
            Refresh
          </BaseButton>
        </div>
        <p className="text-sm text-gray-600">
          Approvals waiting for your decision.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <Icon name="check-circle" className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Approvals</h3>
              <p className="text-gray-600">
                You don't have any approvals waiting for your decision.
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((approval) => (
            <Card key={approval.approvalId} shadow="sm" isPressable>
              <CardBody className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{approval.ticketSubject}</h3>
                      <StatusBadge color="warning">
                        Pending
                      </StatusBadge>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Icon name="clipboard-document-check" className="h-4 w-4" />
                        <span>Workflow: {approval.workflowName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon name="user" className="h-4 w-4" />
                        <span>Step: {approval.stepName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon name="clock" className="h-4 w-4" />
                        <span>
                          Requested {formatDateTime(approval.requestedAt, { timezone })} by{' '}
                          {approval.requestedByUserName}
                        </span>
                      </div>
                    </div>

                    <BaseButton
                      size="sm"
                      color="primary"
                      onPress={() => handleViewTicket(approval.ticketId)}
                      icon={<Icon name="arrow-right" className="h-3.5 w-3.5" />}
                    >
                      View Ticket & Decide
                    </BaseButton>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export default PendingApprovalsPage;
