import type { MailboxConnectError } from '@/api/local/mailbox';
import type { EmailSignaturePreference } from '@/api/local/preferences';
import { ModalHeader } from '@/components/shared';
import { useMailbox } from '@/hooks/useMailbox';
import { useUserPreference } from '@/hooks/useUserPreference';
import type { TicketEmailRecipientDto } from '@/types/ticket';
import {
  BaseButton,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseToggle,
} from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { RichTextEditor } from '@brainforgeau/components/text-editor';
import { toast } from '@heroui/react';
import { type FC, useEffect, useState } from 'react';
import { SignatureBlock } from './SignatureBlock';

const CONNECT_ERRORS: Record<MailboxConnectError, string> = {
  MailboxMismatch: 'This Microsoft mailbox is not your login email.',
  Denied: 'Microsoft sign-in was cancelled, so the mailbox was not connected.',
  Failed: 'The mailbox could not be connected. Try again.',
};

interface EditSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** For the preview: who the reply goes to, and its subject line. */
  recipient?: TicketEmailRecipientDto | null;
  subject?: string;
  /** The last connect attempt failed for this reason. */
  connectError?: MailboxConnectError;
}

/**
 * Screen 08: the tech's own mailbox and email signature, opened from "Edit
 * signature" in the reply composer. The signature is a per-user preference;
 * the server sanitises it on save and the email sender reads it from there.
 */
export const EditSignatureModal: FC<EditSignatureModalProps> = ({
  isOpen,
  onClose,
  recipient,
  subject,
  connectError,
}) => {
  const { mailbox, connect, isConnecting } = useMailbox();
  const signature =
    useUserPreference<EmailSignaturePreference>('email.signature');
  const [html, setHtml] = useState('');
  const [addToReplies, setAddToReplies] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Start from what is saved each time the dialog opens.
  const saved = signature.value;
  useEffect(() => {
    if (!isOpen) return;
    setHtml(saved?.html ?? '');
    setAddToReplies(saved?.addToReplies ?? true);
  }, [isOpen, saved]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await signature.save({ html, addToReplies }, { immediate: true });
      toast('Signature saved', { variant: 'success' });
      onClose();
    } catch {
      toast('Signature not saved', {
        description: 'Images must be https links. Check it and try again.',
        variant: 'danger',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const status = mailbox?.status ?? 'NotConnected';
  const hasSignature = html.replace(/<[^>]*>/g, '').trim().length > 0;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg">
      <BaseModalContent>
        <ModalHeader>Your email signature</ModalHeader>
        <BaseModalBody>
          <div className="space-y-5">
            <section>
              <h3 className="mb-1.5 text-xs font-bold">Mailbox</h3>
              <div className="flex items-center gap-3 rounded-[3px] border border-[#d1d9e0] px-3 py-2 text-sm">
                <Icon name="email" className="h-4 w-4 text-default-500" />
                <span className="truncate">
                  {mailbox?.address ?? 'No mailbox connected'}
                </span>
                {status === 'Connected' && (
                  <span className="inline-flex items-center gap-1 rounded-[2px] bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">
                    <Icon name="check" className="h-3 w-3" />
                    Connected
                  </span>
                )}
                {status === 'NeedsReconnect' && (
                  <span className="rounded-[2px] bg-[#f8e6a0] px-1.5 py-0.5 text-xs font-semibold text-[#7f5f01]">
                    Needs reconnecting
                  </span>
                )}
                <span className="ml-auto shrink-0">
                  {status === 'NotConnected' ? (
                    <BaseButton
                      variant="bordered"
                      color="light"
                      size="sm"
                      onPress={() => connect()}
                      isLoading={isConnecting}
                    >
                      Connect mailbox
                    </BaseButton>
                  ) : (
                    <button
                      type="button"
                      onClick={() => connect()}
                      disabled={isConnecting}
                      className="text-sm text-blue hover:underline disabled:opacity-50"
                    >
                      Reconnect
                    </button>
                  )}
                </span>
              </div>
              {connectError ? (
                <p className="mt-1.5 text-xs text-danger">
                  {CONNECT_ERRORS[connectError] ?? CONNECT_ERRORS.Failed}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-default-500">
                  Your replies go out from your own mailbox, and client answers
                  come back into the ticket.
                </p>
              )}
            </section>

            <section>
              <h3 className="mb-1.5 text-xs font-bold">Signature</h3>
              <div className="rounded-[3px] border border-[#d1d9e0]">
                <RichTextEditor
                  content={html}
                  onChange={setHtml}
                  placeholder="Your name, role and phone number"
                />
              </div>
            </section>

            <BaseToggle isSelected={addToReplies} onChange={setAddToReplies}>
              Add to every email reply
            </BaseToggle>

            <section>
              <h3 className="mb-1.5 text-xs font-bold">Preview</h3>
              <div className="rounded-[3px] border border-[#d1d9e0] text-xs">
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-b border-[#d1d9e0] px-3 py-2">
                  <dt className="text-default-500">From</dt>
                  <dd className="truncate">
                    {mailbox?.address
                      ? `${mailbox.displayName ?? ''} <${mailbox.address}>`.trim()
                      : 'Your mailbox'}
                  </dd>
                  <dt className="text-default-500">To</dt>
                  <dd className="truncate">
                    {recipient
                      ? recipient.name
                        ? `${recipient.name} <${recipient.address}>`
                        : recipient.address
                      : 'The ticket contact'}
                  </dd>
                  {subject && (
                    <>
                      <dt className="text-default-500">Subject</dt>
                      <dd className="truncate font-semibold">{subject}</dd>
                    </>
                  )}
                </dl>
                <div className="space-y-2 px-3 py-3">
                  <p className="italic text-default-400">Your reply...</p>
                  {addToReplies && hasSignature && (
                    <SignatureBlock html={html} />
                  )}
                </div>
              </div>
            </section>
          </div>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton
            variant="bordered"
            color="light"
            onPress={onClose}
            isDisabled={isSaving}
          >
            Cancel
          </BaseButton>
          <BaseButton onPress={handleSave} isLoading={isSaving}>
            Save
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
