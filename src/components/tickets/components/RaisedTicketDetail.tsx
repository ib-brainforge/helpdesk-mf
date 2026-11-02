/**
 * A ticket the tenant raised that a helpdesk above it works, as the tenant
 * sees it: /tickets/:id?handledBy=above.
 *
 * The office's projection, not the tenant's own ticket: status, priority and
 * the public replies, never internal notes, and none of the staff controls
 * (assignment, status, time, links), which belong to the office. The requester
 * and the tenant's staff can reply; the reply is filed in the office's
 * helpdesk. Replies and status arrive live through the ticket's realtime
 * group, which the backend opens to callers who can see the ticket here.
 */

import { AppLoadingSplash } from '@/components/AppSplash';
import { StatusBadge, UserCell } from '@/components/shared';
import {
  useRaisedTicket,
  useRaisedTicketComments,
  useReplyOnRaisedTicket,
} from '@/hooks/useProviderSupport';
import { useRealtimeComments } from '@/hooks/useRealtimeComments';
import { useRealtimeTickets } from '@/hooks/useRealtimeTickets';
import { useTenantNames } from '@/hooks/useTenantNames';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import type { TicketPriority, TicketStatus } from '@/types/ticket';
import { BaseButton, BaseTextarea, Box } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import {
  EmptyState,
  PageBody,
  usePageTitle,
} from '@brainforgeau/components/page';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import { toast } from '@heroui/react';
import { useNavigate } from '@modern-js/runtime/router';
import DOMPurify from 'dompurify';
import { type FC, useMemo, useState } from 'react';
import { replyToHtml } from '../handled-above';
import { getPriorityConfig } from '../ticket-priority-config';
import { getStatusConfig } from '../ticket-status-config';
import { HandledByBadge } from './HandledByBadge';
import { TicketDescriptionContent } from './TicketDescriptionContent';

const TICKETS_PATH = '/tickets';

export const RaisedTicketDetail: FC<{ ticketId: string }> = ({ ticketId }) => {
  const navigate = useNavigate();
  const timezone = useTimezone();
  const { data: ticket, isLoading, isError, error } = useRaisedTicket(ticketId);
  const { data: comments = [], isLoading: commentsLoading } =
    useRaisedTicketComments(ticketId);
  useRealtimeComments(ticketId);
  useRealtimeTickets();
  usePageTitle(ticket?.subject ? `Ticket: ${ticket.subject}` : 'Ticket');

  const authorIds = useMemo(
    () => comments.map(comment => comment.authorId),
    [comments],
  );
  const { userMap } = useUserEnrichment(authorIds);
  const handlerIds = useMemo(
    () => [ticket?.providerTenantId],
    [ticket?.providerTenantId],
  );
  const handlerNames = useTenantNames(handlerIds);
  const handlerName = ticket?.providerTenantId
    ? handlerNames[ticket.providerTenantId]
    : undefined;

  const reply = useReplyOnRaisedTicket(ticketId);
  const [draft, setDraft] = useState('');
  // One key per draft, so a resend after a timeout cannot post it twice.
  const [replyKey, setReplyKey] = useState(() => crypto.randomUUID());
  const sendReply = () => {
    if (!draft.trim()) return;
    reply.mutate(
      { body: replyToHtml(draft), idempotencyKey: replyKey },
      {
        onSuccess: () => {
          setDraft('');
          setReplyKey(crypto.randomUUID());
        },
        onError: () =>
          toast('Your reply was not sent', {
            description: 'Please try again in a moment.',
            variant: 'danger',
          }),
      },
    );
  };

  const back = () => navigate(TICKETS_PATH);

  if (isLoading) return <AppLoadingSplash />;

  if (isError || !ticket) {
    const notFound =
      !isError ||
      (error as { response?: { status?: number } } | null)?.response?.status ===
        404;
    return (
      <PageBody className="items-center justify-center">
        <EmptyState
          title={
            notFound
              ? "This ticket couldn't be found"
              : "This ticket couldn't be loaded"
          }
          description={
            notFound
              ? 'It may belong to another organisation, or it is no longer available.'
              : 'Helpdesk could not be reached. Try again in a moment.'
          }
          action={
            <BaseButton color="primary" onPress={back}>
              Back to tickets
            </BaseButton>
          }
        />
      </PageBody>
    );
  }

  const status = getStatusConfig(ticket.status as TicketStatus);
  const priority = getPriorityConfig(ticket.priority as TicketPriority);

  return (
    <PageBody>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div>
          <BaseButton
            variant="light"
            size="sm"
            onPress={back}
            icon={<Icon name="arrow-left" className="h-4 w-4" />}
          >
            Tickets
          </BaseButton>
        </div>

        <Box>
          <h1 className="text-xl font-semibold">
            {ticket.subject || 'Untitled ticket'}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-default-600">
            <StatusBadge color={status.color}>{status.label}</StatusBadge>
            <StatusBadge color={priority.color}>{priority.label}</StatusBadge>
            {/* The projection does not say how far up; any handler here is above. */}
            <HandledByBadge level={1} tenantName={handlerName} />
            <span>Raised {formatDateTime(ticket.createdAt, { timezone })}</span>
            {ticket.forwardedFromTenantId && (
              <span>Forwarded by your team</span>
            )}
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
              No replies yet. Answers from the team handling it appear here.
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
                    <span>
                      {formatDateTime(comment.createdAt, { timezone })}
                    </span>
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
          <div className="border-default-200 mt-4 flex flex-col gap-2 border-t pt-4">
            <BaseTextarea
              label="Reply"
              labelPlacement="outside"
              placeholder="Write a reply to the team handling this ticket"
              value={draft}
              onValueChange={setDraft}
              minRows={3}
              isDisabled={reply.isPending}
            />
            <div className="flex justify-end">
              <BaseButton
                color="primary"
                onPress={sendReply}
                isDisabled={!draft.trim() || reply.isPending}
              >
                {reply.isPending ? 'Sending...' : 'Send reply'}
              </BaseButton>
            </div>
          </div>
        </Box>
      </div>
    </PageBody>
  );
};
