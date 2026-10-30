import { decodePlainText } from '@/components/tickets/portal';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import { type CommentDto, CommentType } from '@/types/comment';
import { fromApiCommentType } from '@/utils/typeMappers';
import { BaseAvatar } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { EmptyState } from '@brainforgeau/components/page';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import DOMPurify from 'dompurify';
import { type FC, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRetryCommentEmail } from '../hooks/useComments';

interface CommentThreadProps {
  comments: CommentDto[];
  isLoading?: boolean;
  /** Needed to resend a failed email. */
  ticketId?: string;
  /**
   * Replies by this author are customer-authored plain text (portal tickets):
   * shown as text only, never interpreted as HTML.
   */
  plainTextAuthorId?: string;
}

/** Messages shown in full at the bottom; anything older collapses to a line. */
const EXPANDED_TAIL = 2;

/**
 * A system log line ("Ticket forwarded to ...") rather than a message. The
 * conversation is messages only: who changed what lives in the ticket's
 * History. A system line that carries an email (the New Request confirmation
 * sent to the contact) is a message the tenant received, so it stays and
 * renders like any other email, with its status and Retry.
 */
const isLogLine = (comment: CommentDto): boolean =>
  (fromApiCommentType(comment.commentType) ?? CommentType.Reply) ===
    CommentType.SystemMessage && !comment.email;

const toPlainText = (html: string): string => {
  if (typeof DOMParser === 'undefined') return html.replace(/<[^>]*>/g, ' ');
  const doc = new DOMParser().parseFromString(
    DOMPurify.sanitize(html),
    'text/html',
  );
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
};

const Chip: FC<{ className: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <span
    className={`inline-flex h-[18px] items-center gap-1 rounded-[2px] px-1.5 text-xs font-semibold ${className}`}
  >
    {children}
  </span>
);

/** "Email" plus where it got to. There is no "Delivered": Graph gives no receipts. */
const EmailStatus: FC<{
  comment: CommentDto;
  onRetry?: () => void;
  isRetrying?: boolean;
}> = ({ comment, onRetry, isRetrying }) => {
  const email = comment.email;
  if (!email) return null;
  return (
    <span className="flex items-center gap-2">
      <Chip className="bg-[#59636e] text-white">Email</Chip>
      {email.status === 'Sent' && (
        <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
          <Icon name="check" className="h-3 w-3" />
          Sent
        </span>
      )}
      {email.status === 'Sending' && (
        <span className="text-xs text-default-400">Sending...</span>
      )}
      {email.status === 'Failed' && (
        <span
          className="flex items-center gap-1 text-xs font-semibold text-danger"
          title={email.statusReason ?? undefined}
        >
          <Icon name="warning" className="h-3 w-3" />
          Failed
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              className="ml-1 font-normal text-blue underline disabled:opacity-50"
            >
              Retry
            </button>
          )}
        </span>
      )}
    </span>
  );
};

export const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  isLoading,
  ticketId,
  plainTextAuthorId,
}) => {
  const timezone = useTimezone();
  const retry = useRetryCommentEmail();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  /*
   * Author names.
   *
   * The DTO carries `createdByUserName`, but nothing populates it for a comment
   * written through the API or by a background job, and the fallback was
   * `authorId`, so those rows printed a raw GUID where a person's name belongs.
   * This is the same identity lookup the grid and the ticket sidebar already
   * use, reading the same cache, so it costs no extra request for ids they have
   * already resolved. Inbound email may have no author at all (an email-only
   * contact), so its sender's name comes from the email itself.
   *
   * Declared before the isLoading early-return: a hook after it would be called
   * on some renders and not others.
   */
  const { userMap } = useUserEnrichment(comments.map(c => c.authorId));

  // Messages only, oldest first, so the newest sits next to the composer.
  const ordered = useMemo(
    () =>
      comments
        .filter(c => !isLogLine(c))
        .sort(
          (a, b) =>
            new Date(a.createdAt ?? 0).getTime() -
            new Date(b.createdAt ?? 0).getTime(),
        ),
    [comments],
  );

  // Open scrolled to the newest message, and follow new ones as they arrive.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when the count changes
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ordered.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-default-500">Loading comments...</div>
      </div>
    );
  }

  if (ordered.length === 0) {
    return (
      <EmptyState
        title="No messages yet"
        description="Replies and internal notes appear here."
        size="sm"
        live
      />
    );
  }

  const authorName = (comment: CommentDto) =>
    (comment.email?.direction === 'Inbound'
      ? comment.email.from.name
      : undefined) ||
    comment.createdByUserName?.trim() ||
    (comment.authorId ? userMap[comment.authorId]?.name : undefined) ||
    comment.email?.from.name ||
    'Unknown user';

  // Older than the last EXPANDED_TAIL messages collapse to a line.
  const tail = new Set(ordered.slice(-EXPANDED_TAIL).map(c => c.id ?? ''));

  return (
    <div
      ref={scrollRef}
      className="max-h-[60vh] space-y-2 overflow-y-auto pr-1"
    >
      {ordered.map(comment => {
        const id = comment.id ?? '';
        const type =
          fromApiCommentType(comment.commentType) ?? CommentType.Reply;
        const time = formatDateTime(comment.createdAt, { timezone });

        const name = authorName(comment);
        const isNote = type === CommentType.InternalNote;
        const cardClass = isNote
          ? 'border-[#d8b84a] bg-[#fdf8e6]'
          : 'border-[#d1d9e0] bg-content1';
        const isOpen = tail.has(id) || expanded.has(id);

        if (!isOpen) {
          return (
            <button
              type="button"
              key={id}
              onClick={() => setExpanded(prev => new Set(prev).add(id))}
              className={`flex w-full items-center gap-3 rounded-[3px] border px-3 py-2 text-left hover:bg-default-50 ${cardClass}`}
            >
              <BaseAvatar name={name} size="sm" className="shrink-0" />
              <span className="shrink-0 text-sm font-semibold">{name}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-default-500">
                {toPlainText(comment.body ?? '')}
              </span>
              {isNote && (
                <Chip className="bg-[#f8e6a0] text-[#7f5f01]">
                  Internal note
                </Chip>
              )}
              <EmailStatus comment={comment} />
              <span className="shrink-0 text-xs text-default-400">{time}</span>
            </button>
          );
        }

        const email = comment.email;
        return (
          <div key={id} className={`rounded-[3px] border p-3 ${cardClass}`}>
            <div className="mb-2 flex items-start gap-3">
              <BaseAvatar name={name} size="sm" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{name}</span>
                  {email && (
                    <span className="truncate text-xs text-default-500">
                      {email.from.address}
                    </span>
                  )}
                  {isNote && (
                    <Chip className="bg-[#f8e6a0] text-[#7f5f01]">
                      <Icon name="lock" className="h-3 w-3" />
                      Internal note
                    </Chip>
                  )}
                </div>
                {email && email.to.length > 0 && (
                  <div className="truncate text-xs text-default-500">
                    To{' '}
                    {email.to
                      .map(t =>
                        t.name ? `${t.name} <${t.address}>` : t.address,
                      )
                      .join(', ')}
                    {email.cc.length > 0 &&
                      `, Cc ${email.cc.map(c => c.address).join(', ')}`}
                  </div>
                )}
              </div>
              <span className="flex shrink-0 items-center gap-2">
                <EmailStatus
                  comment={comment}
                  onRetry={
                    ticketId && email?.direction === 'Outbound'
                      ? () => retry.mutate({ ticketId, commentId: id })
                      : undefined
                  }
                  isRetrying={retry.isPending}
                />
                <span className="text-xs text-default-400">{time}</span>
              </span>
            </div>
            {plainTextAuthorId &&
            comment.authorId === plainTextAuthorId &&
            type === CommentType.Reply ? (
              <p className="whitespace-pre-wrap pl-11 text-sm text-foreground">
                {decodePlainText(comment.body ?? '')}
              </p>
            ) : (
              <div
                className="pl-11 text-sm text-foreground"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitised with DOMPurify
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(comment.body ?? ''),
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
