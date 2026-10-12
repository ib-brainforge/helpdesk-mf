import { usePendingApprovals } from '@/components/approvals';
import { StatusBadge } from '@/components/shared';
import { useTimezone } from '@/security';
import { BaseButton, BaseCard, Icon } from '@brainforgeau/components';
import { formatDateTime } from '@brainforgeau/components/utils';
import { Card, CardContent } from '@heroui/react';
import { Helmet } from '@modern-js/runtime/head';
import { useNavigate } from '@modern-js/runtime/router';
import { useCallback } from 'react';

// REVIEW: Dashboard showing pending approvals for current user

function PendingApprovalsPage() {
  const navigate = useNavigate();
  const timezone = useTimezone();
  const { items, isLoading, refetch } = usePendingApprovals();

  const handleViewTicket = useCallback(
    (ticketId?: string) => {
      if (!ticketId) return;
      navigate(`/tickets/${ticketId}`);
    },
    [navigate],
  );

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-default-600">Loading pending approvals...</p>
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
        <div className="mb-2 flex items-center justify-between">
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
        <p className="text-sm text-default-600">
          Approvals waiting for your decision.
        </p>
      </div>

      {items.length === 0 ? (
        <BaseCard>
          <div className="py-12 text-center">
            <Icon
              name="check-circle"
              className="mx-auto mb-4 h-16 w-16 text-default-300"
            />
            <h3 className="mb-2 text-lg font-semibold">No Pending Approvals</h3>
            <p className="text-default-600">
              You don't have any approvals waiting for your decision.
            </p>
          </div>
        </BaseCard>
      ) : (
        <div className="space-y-4">
          {items.map(approval => (
            <BaseCard key={approval.approvalId}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-lg font-semibold">
                      {approval.ticketSubject}
                    </h3>
                    <StatusBadge color="warning">Pending</StatusBadge>
                  </div>

                  <div className="mb-4 space-y-1 text-sm text-default-600">
                    <div className="flex items-center gap-2">
                      <Icon name="user" className="h-4 w-4" />
                      <span>Step: {approval.stepName}</span>
                    </div>
                    {approval.requestedAt && (
                      <div className="flex items-center gap-2">
                        <Icon name="clock" className="h-4 w-4" />
                        <span>
                          Requested{' '}
                          {formatDateTime(approval.requestedAt, { timezone })}{' '}
                          by {approval.requestedByUserName}
                        </span>
                      </div>
                    )}
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
            </BaseCard>
          ))}
        </div>
      )}
    </>
  );
}

export default PendingApprovalsPage;
