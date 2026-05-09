/**
 * Principal ticket detail page — /principal/[principalId]/tickets/[ticketId]
 */

import { PageSpinner, BaseButton, BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import { toast } from '@heroui/react';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useParams, useNavigate } from '@modern-js/runtime/router';
import { usePrincipalTicket, useUpdatePrincipalTicketStatus } from '@/hooks/usePrincipalTicket';
import { StatusBadge } from '@/components/shared';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';


function PrincipalTicketDetailPage() {
  const { principalId, ticketId } = useParams<{ principalId: string; ticketId: string }>();
  const navigate = useNavigate();
  const timezone = useTimezone();
  const { data: ticket, isLoading, error } = usePrincipalTicket(principalId!, ticketId!);
  const updateStatusMutation = useUpdatePrincipalTicketStatus(principalId!);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <PageSpinner title="Loading ticket..." />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
        <p className="font-semibold">Ticket not found</p>
        <BaseButton
          variant="light"
          size="sm"
          onPress={() => navigate(`/principal/${principalId}/tickets`)}
        >
          Back to tickets
        </BaseButton>
      </div>
    );
  }

  const statusColorMap: Record<string, 'primary' | 'warning' | 'success' | 'default'> = {
    New: 'primary',
    InProgress: 'warning',
    Closed: 'success',
  };

  const handleStatusChange = async (status: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        ticketId: ticketId!,
        command: { newStatus: status as any },
      });
      toast('Status updated');
    } catch {
      toast('Failed to update status');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{ticket.subject ?? 'Untitled Ticket'}</h1>
          <p className="text-sm text-muted-foreground font-mono">
            {ticket.id?.substring(0, 8)}
          </p>
        </div>
        <BaseButton
          variant="light"
          size="sm"
          onPress={() => navigate(`/principal/${principalId}/tickets`)}
        >
          Back
        </BaseButton>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Status</span>
          <BaseSelect
            size="sm"
            selectedKey={ticket.status ? ticket.status : null}
            onSelectionChange={keys => {
              const val = keys?.toString();
              if (val) handleStatusChange(val);
            }}
            className="w-40"
          >
            {['New', 'InProgress', 'Closed'].map(s => (
              <BaseSelectItem key={s}>{s}</BaseSelectItem>
            ))}
          </BaseSelect>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Priority</span>
          <StatusBadge
            color={
              ticket.priority === 'Critical'
                ? 'danger'
                : ticket.priority === 'High'
                  ? 'warning'
                  : ticket.priority === 'Normal'
                    ? 'primary'
                    : 'default'
            }
          >
            {ticket.priority ?? 'None'}
          </StatusBadge>
        </div>

        {ticket.categoryId && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Category ID</span>
            <span className="font-mono text-xs">{ticket.categoryId.substring(0, 8)}</span>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Created</span>
          <span className="text-sm">{formatDateTime(ticket.createdAt, { timezone })}</span>
        </div>
      </div>

      {ticket.description && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Description
          </h2>
          <div className="border rounded p-4 text-sm whitespace-pre-wrap">{ticket.description}</div>
        </div>
      )}
    </div>
  );
}

export default withAuthenticationRequired(PrincipalTicketDetailPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
