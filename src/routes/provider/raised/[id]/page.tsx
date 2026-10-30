/**
 * A ticket raised with our provider: /provider/raised/:id
 *
 * Read only: the ticket's status and the provider's public replies. Internal
 * notes never reach this side. This is where notification email links land.
 */

import { AppAuthSplash, AppLoadingSplash } from '@/components/AppSplash';
import { StatusBadge, UserCell } from '@/components/shared';
import { TicketDescriptionContent } from '@/components/tickets/components/TicketDescriptionContent';
import { getPriorityConfig } from '@/components/tickets/ticket-priority-config';
import { getStatusConfig } from '@/components/tickets/ticket-status-config';
import {
  useRaisedTicket,
  useRaisedTicketComments,
} from '@/hooks/useProviderSupport';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import type { TicketPriority, TicketStatus } from '@/types/ticket';
import { RAISED_WITH_PROVIDER_PATH } from '@/views';
import { BaseButton, Box } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { EmptyState, usePageTitle } from '@brainforgeau/components/page';
import { formatDateTime } from '@brainforgeau/components/utils';
import {
  useTimezone,
  withAuthenticationRequired,
} from '@brainforgeau/security';
import { useNavigate, useParams } from '@modern-js/runtime/router';
import DOMPurify from 'dompurify';
import { useMemo } from 'react';

function RaisedTicketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const timezone = useTimezone();
  const { data: ticket, isLoading, isError } = useRaisedTicket(id);
  const { data: comments = [], isLoading: commentsLoading } =
    useRaisedTicketComments(id);
  usePageTitle(ticket?.subject ? `Ticket: ${ticket.subject}` : 'Ticket');

  const authorIds = useMemo(
    () => comments.map(comment => comment.authorId),
    [comments],
  );
  const { userMap } = useUserEnrichment(authorIds);

  const back = () => navigate(RAISED_WITH_PROVIDER_PATH);

  if (isLoading) return <AppLoadingSplash />;

  if (isError || !ticket) {
    return (
      <div className="flex w-full flex-1 items-center justify-center p-6">
        <EmptyState
          title="This ticket couldn't be found"
          description="It may belong to another organisation, or it is no longer available."
          action={
            <BaseButton color="primary" onPress={back}>
              Back to Raised with our provider
            </BaseButton>
          }
        />
      </div>
    );
  }

  const status = getStatusConfig(ticket.status as TicketStatus);
  const priority = getPriorityConfig(ticket.priority as TicketPriority);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 md:px-6">
      <div>
        <BaseButton
          variant="light"
          size="sm"
          onPress={back}
          icon={<Icon name="arrow-left" className="h-4 w-4" />}
        >
          Raised with our provider
        </BaseButton>
      </div>

      <Box>
        <h1 className="text-xl font-semibold">
          {ticket.subject || 'Untitled ticket'}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-default-600">
          <StatusBadge color={status.color}>{status.label}</StatusBadge>
          <StatusBadge color={priority.color}>{priority.label}</StatusBadge>
          <span>Raised {formatDateTime(ticket.createdAt, { timezone })}</span>
          {ticket.forwardedFromTenantId && <span>Forwarded by your team</span>}
        </div>
        {ticket.description && (
          <div className="mt-4">
            <TicketDescriptionContent value={ticket.description} />
          </div>
        )}
      </Box>

      <Box>
        <h2 className="mb-3 text-base font-semibold">Replies</h2>
        {commentsLoading ? (
          <p className="text-sm text-default-500">Loading replies...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-default-500">
            No replies yet. Your provider's answers appear here.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {comments.map(comment => (
              <li
                key={comment.id}
                className="border-default-200 rounded-md border p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-default-500">
                  <UserCell
                    userInfo={
                      comment.authorId ? userMap[comment.authorId] : undefined
                    }
                    avatarSize="xs"
                  />
                  <span>{formatDateTime(comment.createdAt, { timezone })}</span>
                </div>
                <div
                  className="prose max-w-none text-sm"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitised with DOMPurify
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(comment.body ?? ''),
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </Box>
    </div>
  );
}

export default withAuthenticationRequired(RaisedTicketPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
