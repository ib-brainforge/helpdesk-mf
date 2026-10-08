import { COMMENT_ERRORS } from '@/api/local/comments';
import type { EmailSignaturePreference } from '@/api/local/preferences';
import { useUploadAttachment } from '@/components/attachments/hooks/useAttachments';
import { AttachmentList, FileUploadZone } from '@/components/file-upload';
import { MAILBOX_QUERY_KEY, useMailbox } from '@/hooks/useMailbox';
import { useUserPreference } from '@/hooks/useUserPreference';
import type { AttachmentDto } from '@/types';
import type { CannedResponseDto } from '@/types/canned-response';
import type { TicketEmailRecipientDto } from '@/types/ticket';
import { BaseButtonSelect } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { RichTextEditor } from '@brainforgeau/components/text-editor';
import { CannedResponsePicker } from '@components/canned-responses';
import { toast } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAddComment, useAddInternalNote } from '../hooks/useComments';
import { SignatureBlock } from './SignatureBlock';

type ComposerMode = 'reply' | 'note';

/** What the composer needs to email a reply. Omit for a plain public reply. */
export interface ReplyEmailContext {
  /** The ticket's contact; null when there is nobody to email. */
  recipient: TicketEmailRecipientDto | null;
  /** Opens the signature and mailbox settings (screen 08). */
  onEditSignature: () => void;
}

interface ReplyEditorProps {
  ticketId: string;
  categoryId?: string;
  onCommentAdded?: () => void;
  /**
   * Present on the ticket page, where a public reply is emailed. Without it
   * (the principal console) a reply is posted to the ticket only.
   */
  email?: ReplyEmailContext;
}

const MAX_CC = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Draft {
  body: string;
  mode: ComposerMode;
  cc: string[];
}

/*
 * The draft survives a full page round trip. Connecting a mailbox sends the
 * browser to Microsoft and back, and losing a half-written reply to that
 * would be worse than not offering the connect link at all. Per ticket, in
 * sessionStorage, cleared once the reply is sent.
 */
const draftKey = (ticketId: string) => `helpdesk:reply-draft:${ticketId}`;

const readDraft = (ticketId: string): Draft | null => {
  try {
    const raw = sessionStorage.getItem(draftKey(ticketId));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
};

const writeDraft = (ticketId: string, draft: Draft | null) => {
  try {
    if (draft)
      sessionStorage.setItem(draftKey(ticketId), JSON.stringify(draft));
    else sessionStorage.removeItem(draftKey(ticketId));
  } catch {
    // Storage unavailable (private window): the draft just is not kept.
  }
};

const isMac = () =>
  typeof navigator !== 'undefined' &&
  /mac/i.test(
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ?? navigator.platform,
  );

const errorCode = (error: unknown): string | undefined => {
  const data = (error as { response?: { data?: unknown } })?.response?.data as
    | { code?: string; errors?: { code?: string }[] }
    | undefined;
  return data?.errors?.[0]?.code ?? data?.code;
};

export const ReplyEditor: React.FC<ReplyEditorProps> = ({
  ticketId,
  categoryId,
  onCommentAdded,
  email,
}) => {
  const initial = useMemo(() => readDraft(ticketId), [ticketId]);
  const [mode, setMode] = useState<ComposerMode>(initial?.mode ?? 'reply');
  const [body, setBody] = useState(initial?.body ?? '');
  const [cc, setCc] = useState<string[]>(initial?.cc ?? []);
  const [ccInput, setCcInput] = useState('');
  const [showCc, setShowCc] = useState((initial?.cc.length ?? 0) > 0);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentDto[]>(
    [],
  );
  const queryClient = useQueryClient();
  const { uploadFiles, uploadProgress, isUploading } = useUploadAttachment();
  const addComment = useAddComment();
  const addNote = useAddInternalNote();
  const isPending = addComment.isPending || addNote.isPending;

  const { mailbox, isConnected } = useMailbox();
  const signature =
    useUserPreference<EmailSignaturePreference>('email.signature');

  /** TipTap emits "<p></p>" for an empty document, so length alone lies. */
  const isBodyEmpty = body.replace(/<[^>]*>/g, '').trim().length === 0;

  useEffect(() => {
    writeDraft(
      ticketId,
      isBodyEmpty && cc.length === 0 ? null : { body, mode, cc },
    );
  }, [ticketId, body, mode, cc, isBodyEmpty]);

  const emailing = mode === 'reply' && !!email;
  const recipient = email?.recipient ?? null;
  const recipientName = recipient?.name?.trim() || recipient?.address || '';
  const recipientFirstName = recipient?.name?.trim()
    ? recipient.name.trim().split(/\s+/)[0]
    : (recipient?.address ?? '');
  /** Why an emailed reply cannot go right now, if it cannot. */
  const blocked = !emailing
    ? null
    : !recipient
      ? 'This ticket has no contact email, so a reply cannot be emailed.'
      : !isConnected
        ? mailbox?.status === 'NeedsReconnect'
          ? 'Your mailbox needs reconnecting, so replies cannot be emailed.'
          : "Your mailbox isn't connected, replies can't be emailed."
        : null;

  const reset = useCallback(() => {
    setBody('');
    setCc([]);
    setCcInput('');
    setShowCc(false);
    setPendingAttachments([]);
    setShowFileUpload(false);
    writeDraft(ticketId, null);
  }, [ticketId]);

  const addCc = useCallback(
    (raw: string) => {
      const address = raw.trim().replace(/[,;]$/, '');
      if (!address) return;
      if (!EMAIL_PATTERN.test(address)) {
        toast(`"${address}" is not an email address`, { variant: 'warning' });
        return;
      }
      if (cc.length >= MAX_CC) {
        toast(`At most ${MAX_CC} Cc recipients`, { variant: 'warning' });
        return;
      }
      if (!cc.includes(address)) setCc(prev => [...prev, address]);
      setCcInput('');
    },
    [cc],
  );

  const handleSubmit = useCallback(() => {
    if (isBodyEmpty || isPending || blocked) return;
    const idempotencyKey = `comment-${Date.now()}`;
    if (mode === 'note') {
      addNote.mutate(
        { ticketId, body, idempotencyKey },
        {
          onSuccess: () => {
            toast('Internal note added', { variant: 'success' });
            reset();
            onCommentAdded?.();
          },
        },
      );
      return;
    }
    addComment.mutate(
      {
        ticketId,
        body,
        idempotencyKey,
        sendEmail: emailing,
        cc: emailing && cc.length > 0 ? cc : undefined,
      },
      {
        onSuccess: () => {
          toast(
            emailing ? `Email sent to ${recipientFirstName}` : 'Reply added',
            { variant: 'success' },
          );
          reset();
          queryClient.invalidateQueries({
            queryKey: ['attachments', ticketId],
          });
          onCommentAdded?.();
        },
        onError: error => {
          const code = errorCode(error);
          if (code === COMMENT_ERRORS.mailboxNotConnected) {
            queryClient.invalidateQueries({ queryKey: MAILBOX_QUERY_KEY });
            toast("Your mailbox isn't connected", {
              description: 'Connect it from Edit signature, then send again.',
              variant: 'danger',
            });
          } else if (code === COMMENT_ERRORS.noEmailRecipient) {
            toast('Nobody to email', {
              description: 'This ticket has no contact email address.',
              variant: 'danger',
            });
          } else if (
            (error as { response?: { status?: number } })?.response?.status ===
            400
          ) {
            toast('Reply not sent', {
              description: 'Check the Cc addresses and try again.',
              variant: 'danger',
            });
          }
        },
      },
    );
  }, [
    isBodyEmpty,
    isPending,
    blocked,
    mode,
    addNote,
    addComment,
    ticketId,
    body,
    emailing,
    cc,
    recipientFirstName,
    reset,
    queryClient,
    onCommentAdded,
  ]);

  const handleCannedResponseSelect = useCallback(
    (response: CannedResponseDto) => {
      if (response.body) setBody(response.body);
    },
    [],
  );

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      try {
        // REVIEW: Upload files and track them for comment association
        const uploadedFiles = await uploadFiles(files, ticketId, undefined);
        if (uploadedFiles && Array.isArray(uploadedFiles)) {
          setPendingAttachments(prev => [
            ...prev,
            ...(uploadedFiles as unknown as AttachmentDto[]),
          ]);
          toast(`${files.length} file(s) uploaded successfully`, {
            variant: 'success',
          });
        }
      } catch {
        toast('Upload failed', { variant: 'danger' });
      }
    },
    [ticketId, uploadFiles],
  );

  const handleRemovePendingAttachment = useCallback((attachmentId: string) => {
    setPendingAttachments(prev => prev.filter(a => a.id !== attachmentId));
  }, []);

  // Ctrl+Enter (Cmd+Enter on a Mac) sends, from anywhere inside the composer.
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const sig = signature.value;
  const showSignature = emailing && !!sig?.addToReplies && !!sig.html.trim();

  return (
    <div className="space-y-3" onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between gap-2">
        <BaseButtonSelect<ComposerMode>
          ariaLabel="Reply or internal note"
          value={mode}
          onChange={setMode}
          options={[
            {
              value: 'reply',
              label: (
                <span className="flex items-center gap-1.5">
                  <Icon name="email" className="h-4 w-4" />
                  {email ? 'Reply by email' : 'Reply'}
                </span>
              ),
            },
            {
              value: 'note',
              label: (
                <span className="flex items-center gap-1.5">
                  <Icon name="lock" className="h-4 w-4" />
                  Internal note
                </span>
              ),
            },
          ]}
        />
        <BaseButton
          variant="bordered"
          color="light"
          onPress={() => setIsPickerOpen(true)}
        >
          Canned Response
        </BaseButton>
      </div>

      {blocked && (
        <div className="flex items-center gap-2 rounded-[3px] bg-[#f8e6a0] px-3 py-2 text-xs text-[#7f5f01]">
          <Icon name="warning" className="h-4 w-4 shrink-0" />
          <span>{blocked}</span>
          {recipient && (
            <button
              type="button"
              onClick={email?.onEditSignature}
              className="ml-auto shrink-0 font-semibold underline"
            >
              {mailbox?.status === 'NeedsReconnect'
                ? 'Reconnect mailbox'
                : 'Connect mailbox'}
            </button>
          )}
        </div>
      )}

      {/*
        One box: the address lines, the editor and the signature, so it reads
        as the email it will send. In note mode it turns yellow and loses the
        addressing, which is the cue that nothing leaves the building.
      */}
      <div
        className={`overflow-hidden rounded-[3px] border ${
          mode === 'note'
            ? 'border-[#d8b84a] bg-[#fdf8e6]'
            : 'border-divider bg-content1 focus-within:border-blue'
        }`}
      >
        {mode === 'note' ? (
          <div className="flex items-center gap-2 border-b border-[#d8b84a] px-3 py-2 text-xs text-[#7f5f01]">
            <Icon name="lock" className="h-3.5 w-3.5" />
            <span>
              <span className="font-semibold">
                Only your team can see this.
              </span>{' '}
              {recipientName || 'The requester'} will not get an email.
            </span>
          </div>
        ) : (
          email && (
            <div className="divide-y divide-divider border-b border-divider text-xs">
              <div className="flex items-center gap-3 px-3 py-2">
                <span className="w-8 shrink-0 text-default-500">From</span>
                <span className="truncate">
                  {mailbox?.address
                    ? `${mailbox.displayName ?? ''} <${mailbox.address}>`.trim()
                    : 'No mailbox connected'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-3 py-1.5">
                <span className="w-8 shrink-0 text-default-500">To</span>
                {recipient ? (
                  <span
                    className="inline-flex h-6 items-center rounded-[3px] bg-default-100 px-2"
                    title={recipient.address}
                  >
                    {recipientName}
                  </span>
                ) : (
                  <span className="text-default-400">No contact email</span>
                )}
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="ml-auto text-blue hover:underline"
                  >
                    + Cc
                  </button>
                )}
              </div>
              {showCc && (
                <div className="flex flex-wrap items-center gap-2 px-3 py-1.5">
                  <span className="w-8 shrink-0 text-default-500">Cc</span>
                  {cc.map(address => (
                    <span
                      key={address}
                      className="inline-flex h-6 items-center gap-1 rounded-[3px] bg-default-100 pr-1 pl-2"
                    >
                      {address}
                      <button
                        type="button"
                        aria-label={`Remove ${address}`}
                        onClick={() =>
                          setCc(prev => prev.filter(a => a !== address))
                        }
                        className="text-default-500 hover:text-danger"
                      >
                        <Icon name="x" className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="email"
                    aria-label="Add a Cc address"
                    placeholder={cc.length ? '' : 'name@example.com'}
                    value={ccInput}
                    onChange={e => setCcInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
                        if (e.ctrlKey || e.metaKey) return;
                        e.preventDefault();
                        addCc(ccInput);
                      } else if (
                        e.key === 'Backspace' &&
                        !ccInput &&
                        cc.length > 0
                      ) {
                        setCc(prev => prev.slice(0, -1));
                      }
                    }}
                    onBlur={() => addCc(ccInput)}
                    className="min-w-40 flex-1 bg-transparent outline-none"
                  />
                </div>
              )}
            </div>
          )
        )}

        <RichTextEditor
          content={body}
          onChange={setBody}
          placeholder={
            mode === 'note'
              ? 'Add an internal note (only visible to your team)...'
              : 'Write your reply...'
          }
        />

        {emailing && (
          <div className="flex items-start justify-between gap-3 px-3 pb-3">
            {showSignature ? (
              <SignatureBlock html={sig.html} />
            ) : (
              <span className="text-xs text-default-400">
                {sig?.html.trim()
                  ? 'Signature off for replies.'
                  : 'No signature yet.'}{' '}
                <button
                  type="button"
                  onClick={email?.onEditSignature}
                  className="text-blue hover:underline"
                >
                  {sig?.html.trim() ? 'Turn it on' : 'Add signature'}
                </button>
              </span>
            )}
            {showSignature && (
              <button
                type="button"
                onClick={email?.onEditSignature}
                className="shrink-0 text-xs text-blue hover:underline"
              >
                Edit signature
              </button>
            )}
          </div>
        )}
      </div>

      {showFileUpload && (
        <div className="space-y-3">
          <FileUploadZone
            onFilesSelected={handleFilesSelected}
            progress={uploadProgress}
            multiple={true}
          />
          {pendingAttachments.length > 0 && (
            <AttachmentList
              attachments={pendingAttachments}
              onDelete={handleRemovePendingAttachment}
              canDelete={true}
            />
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BaseButton
            variant="bordered"
            color="light"
            onPress={() => setShowFileUpload(!showFileUpload)}
            icon={<Icon name="clip" className="h-4 w-4" />}
          >
            {showFileUpload ? 'Hide attachments' : 'Attach Files'}
          </BaseButton>
          {pendingAttachments.length > 0 && !showFileUpload && (
            <span className="text-xs text-default-500">
              {pendingAttachments.length} file(s) attached
            </span>
          )}
          <span className="hidden text-xs text-default-400 sm:inline">
            Press{' '}
            <kbd className="rounded bg-default-100 px-1 py-0.5 font-mono text-xs">
              {isMac() ? 'Cmd+Enter' : 'Ctrl+Enter'}
            </kbd>{' '}
            to {mode === 'note' ? 'save' : 'send'}
          </span>
        </div>
        <BaseButton
          onPress={handleSubmit}
          isLoading={isPending}
          isDisabled={isPending || isUploading || isBodyEmpty || !!blocked}
          icon={
            <Icon
              name={mode === 'note' ? 'lock' : 'send'}
              className="h-4 w-4"
            />
          }
        >
          {mode === 'note'
            ? 'Add internal note'
            : emailing
              ? `Send email to ${recipientFirstName || 'contact'}`
              : 'Send reply'}
        </BaseButton>
      </div>

      <CannedResponsePicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleCannedResponseSelect}
        categoryId={categoryId}
      />
    </div>
  );
};
