/**
 * Principal ticket detail page — /principal/[principalId]/tickets/[ticketId]
 *
 * W1-P8: Migrated to <DetailPage> with four tabs:
 *   - Details (form-bearing via useEntityForm)
 *   - Comments (read-only thread)
 *   - History (placeholder — read-only)
 *   - Audit (placeholder — read-only)
 *
 * Tab state is URL-synced via `?tab=` using useTabSearchParam + useDetailTabState.
 */

import { CommentThread, ReplyEditor, useComments } from '@/components/comments';
import { StatusBadge } from '@/components/shared';
import { usePrincipal } from '@/hooks/usePrincipal';
import {
  usePrincipalTicket,
  useUpdatePrincipalTicketPriority,
  useUpdatePrincipalTicketStatus,
} from '@/hooks/usePrincipalTicket';
import { useTabSearchParam } from '@/hooks/useTabSearchParam';
import {
  BaseButton,
  BaseSelect,
  BaseSelectItem,
  PageSpinner,
} from '@brainforgeau/components';
import {
  DetailPage,
  EmptyState,
  PendingCrumb,
  useDetailTabState,
  useEntityForm,
} from '@brainforgeau/components/page';
import { formatDateTime } from '@brainforgeau/components/utils';
import {
  HelpdeskDomainTicketsEnumsTicketPriority,
  HelpdeskDomainTicketsEnumsTicketStatus,
} from '@brainforgeau/helpdesk-client';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useTimezone } from '@brainforgeau/security';
import { useNavigate, useParams } from '@modern-js/runtime/router';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const ticketDetailsSchema = z.object({
  status: z.nativeEnum(HelpdeskDomainTicketsEnumsTicketStatus),
  priority: z.nativeEnum(HelpdeskDomainTicketsEnumsTicketPriority),
});

type TicketDetailsFormData = z.infer<typeof ticketDetailsSchema>;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function PrincipalTicketDetailPage() {
  const { principalId, ticketId } = useParams<{
    principalId: string;
    ticketId: string;
  }>();
  const navigate = useNavigate();
  const timezone = useTimezone();
  const { data: principal } = usePrincipal(principalId);

  const {
    data: ticket,
    isLoading,
    error,
  } = usePrincipalTicket(principalId!, ticketId!);

  const updateStatus = useUpdatePrincipalTicketStatus(principalId!);
  const updatePriority = useUpdatePrincipalTicketPriority(principalId!);

  const { comments, isLoading: commentsLoading } = useComments(ticketId!);

  const { getParam, setParam } = useTabSearchParam();
  const { activeTab, setActiveTab } = useDetailTabState({
    defaultTab: 'details',
    getParam,
    setParam,
  });

  const detailsForm = useEntityForm<typeof ticketDetailsSchema>({
    schema: ticketDetailsSchema,
    defaultValues: {
      status: HelpdeskDomainTicketsEnumsTicketStatus.New,
      priority: HelpdeskDomainTicketsEnumsTicketPriority.Normal,
    },
    values: ticket
      ? {
          status: ticket.status ?? HelpdeskDomainTicketsEnumsTicketStatus.New,
          priority:
            ticket.priority ?? HelpdeskDomainTicketsEnumsTicketPriority.Normal,
        }
      : undefined,
    onSubmit: async (values: TicketDetailsFormData) => {
      if (!ticketId) return;
      if (ticket?.status !== values.status) {
        await updateStatus.mutateAsync({
          ticketId,
          command: { newStatus: values.status },
        });
      }
      if (ticket?.priority !== values.priority) {
        await updatePriority.mutateAsync({
          ticketId,
          command: { newPriority: values.priority },
        });
      }
    },
    invalidateQueryKeys: [
      ['principal-ticket', principalId, ticketId],
      ['principal-tickets', principalId],
    ],
    toast: { success: 'Ticket saved', error: 'Save failed' },
  });

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <PageSpinner title="Loading ticket..." />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <EmptyState
        title="Ticket not found"
        description="This ticket does not exist or has been removed."
        action={
          <BaseButton
            onPress={() => navigate(`/principal/${principalId}/tickets`)}
          >
            Back to tickets
          </BaseButton>
        }
      />
    );
  }

  const form = detailsForm.form;

  return (
    <DetailPage
      title={ticket.subject ?? 'Untitled Ticket'}
      breadcrumbsKey="principal.tickets.detail"
      breadcrumbsParams={{
        principalId: principalId!,
        principalName: principal?.name ?? PendingCrumb,
        ticketId: ticketId!,
        subject: ticket.subject ?? PendingCrumb,
      }}
      documentTitle={ticket.subject ? `Ticket: ${ticket.subject}` : undefined}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Tab: Details                                                         */}
      {/* ------------------------------------------------------------------ */}
      <DetailPage.Tab
        id="details"
        title="Details"
        formActions={detailsForm.formActions}
      >
        <div className="max-w-lg">
          <form className="flex flex-col gap-5">
            {/* Ticket metadata */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Ticket ID
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {ticket.id?.substring(0, 8)}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Created
              </span>
              <span className="text-sm">
                {formatDateTime(ticket.createdAt, { timezone })}
              </span>
            </div>

            {/* Editable fields */}
            <form.Field name="status">
              {field => (
                <BaseSelect
                  label="Status"
                  selectedKey={field.state.value}
                  onSelectionChange={key => {
                    if (key)
                      field.handleChange(
                        String(key) as HelpdeskDomainTicketsEnumsTicketStatus,
                      );
                  }}
                  isInvalid={field.state.meta.errors.length > 0}
                  errorMessage={field.state.meta.errors.map(String).join(', ')}
                >
                  {Object.values(HelpdeskDomainTicketsEnumsTicketStatus).map(
                    s => (
                      <BaseSelectItem key={s}>{s}</BaseSelectItem>
                    ),
                  )}
                </BaseSelect>
              )}
            </form.Field>

            <form.Field name="priority">
              {field => (
                <BaseSelect
                  label="Priority"
                  selectedKey={field.state.value}
                  onSelectionChange={key => {
                    if (key)
                      field.handleChange(
                        String(key) as HelpdeskDomainTicketsEnumsTicketPriority,
                      );
                  }}
                  isInvalid={field.state.meta.errors.length > 0}
                  errorMessage={field.state.meta.errors.map(String).join(', ')}
                >
                  {Object.values(HelpdeskDomainTicketsEnumsTicketPriority).map(
                    p => (
                      <BaseSelectItem key={p}>{p}</BaseSelectItem>
                    ),
                  )}
                </BaseSelect>
              )}
            </form.Field>

            {ticket.description && (
              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Description
                </span>
                <div className="border rounded p-4 text-sm whitespace-pre-wrap">
                  {ticket.description}
                </div>
              </div>
            )}

            {ticket.categoryId && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Category ID
                </span>
                <span className="font-mono text-xs">
                  {ticket.categoryId.substring(0, 8)}
                </span>
              </div>
            )}
          </form>
        </div>
      </DetailPage.Tab>

      {/* ------------------------------------------------------------------ */}
      {/* Tab: Comments                                                        */}
      {/* ------------------------------------------------------------------ */}
      <DetailPage.Tab id="comments" title="Comments">
        <div className="flex flex-col gap-4 max-w-3xl">
          {commentsLoading ? (
            <PageSpinner title="Loading comments..." />
          ) : (
            <>
              <CommentThread comments={comments} />
              <ReplyEditor ticketId={ticketId!} />
            </>
          )}
        </div>
      </DetailPage.Tab>

      {/* ------------------------------------------------------------------ */}
      {/* Tab: History                                                         */}
      {/* ------------------------------------------------------------------ */}
      <DetailPage.Tab id="history" title="History">
        <EmptyState
          title="No history yet"
          description="Status and field changes will appear here."
        />
      </DetailPage.Tab>

      {/* ------------------------------------------------------------------ */}
      {/* Tab: Audit                                                           */}
      {/* ------------------------------------------------------------------ */}
      <DetailPage.Tab id="audit" title="Audit">
        <EmptyState
          title="No audit entries"
          description="System audit events for this ticket will appear here."
        />
      </DetailPage.Tab>
    </DetailPage>
  );
}

export default withAuthenticationRequired(PrincipalTicketDetailPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
