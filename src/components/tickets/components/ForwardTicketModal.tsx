import {
  BaseButton,
  BaseCheckbox,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@brainforgeau/components';
import { addToast } from '@heroui/react';
import { type FC, useEffect, useState } from 'react';
import { useForwardTicket } from '../hooks/useTickets';

interface ForwardTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  defaultSubject: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseEmails = (value: string): string[] =>
  value
    .split(/[,;\s]+/)
    .map(e => e.trim())
    .filter(e => e.length > 0);

const isValidEmailList = (value: string): boolean => {
  const emails = parseEmails(value);
  return emails.length > 0 && emails.every(e => EMAIL_REGEX.test(e));
};

export const ForwardTicketModal: FC<ForwardTicketModalProps> = ({
  isOpen,
  onClose,
  ticketId,
  defaultSubject,
}) => {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState('');
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const forwardMutation = useForwardTicket();

  useEffect(() => {
    if (isOpen) {
      setTo('');
      setCc('');
      setSubject(defaultSubject);
      setBody('');
      setIncludeAttachments(false);
    }
  }, [isOpen, defaultSubject]);

  const handleConfirm = () => {
    if (!isValidEmailList(to)) return;

    const toEmails = parseEmails(to);
    const ccEmails = cc.trim() ? parseEmails(cc) : undefined;

    forwardMutation.mutate(
      {
        ticketId,
        to: toEmails,
        cc: ccEmails,
        subject: subject.trim(),
        body: body.trim(),
        includeAttachments,
      },
      {
        onSuccess: () => {
          addToast({
            title: 'Ticket forwarded',
            description: `Sent to ${toEmails.join(', ')}`,
            severity: 'success',
          });
          onClose();
        },
        onError: (error: any) => {
          const errorCode = error?.response?.data?.errors?.[0]?.code;
          if (errorCode === 'EMAIL_SEND_FAILED') {
            addToast({
              title: 'Email not configured',
              description:
                'Configure email settings first before forwarding tickets.',
              severity: 'danger',
            });
          } else {
            addToast({
              title: 'Error',
              description: 'Failed to forward ticket. Please try again.',
              severity: 'danger',
            });
          }
        },
      },
    );
  };

  const toValid = isValidEmailList(to);
  const ccValid = !cc.trim() || isValidEmailList(cc);

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg">
      <BaseModalContent>
        <BaseModalHeader title="Forward Ticket By Email">
          Forward Ticket By Email
        </BaseModalHeader>
        <BaseModalBody>
          <div className="space-y-4">
            <BaseInput
              label="To"
              placeholder="email@example.com, another@example.com"
              value={to}
              onChange={e => setTo(e.target.value)}
              description="Separate multiple addresses with commas or spaces"
              isInvalid={!!to && !toValid}
              errorMessage={!!to && !toValid ? 'Enter valid email addresses' : undefined}
              isRequired
            />
            <BaseInput
              label="CC (optional)"
              placeholder="cc@example.com"
              value={cc}
              onChange={e => setCc(e.target.value)}
              isInvalid={!!cc && !ccValid}
              errorMessage={!!cc && !ccValid ? 'Enter valid email addresses' : undefined}
            />
            <BaseInput
              label="Subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              isRequired
            />
            <BaseInput
              label="Message"
              value={body}
              onChange={e => setBody(e.target.value)}
              description="Optional additional message to include above the ticket content"
            />
            <BaseCheckbox
              isSelected={includeAttachments}
              onValueChange={setIncludeAttachments}
            >
              Include attachments
            </BaseCheckbox>
          </div>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton
            variant="bordered"
            onPress={onClose}
            isDisabled={forwardMutation.isPending}
          >
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleConfirm}
            isDisabled={!toValid || !subject.trim() || !ccValid}
            isLoading={forwardMutation.isPending}
          >
            Send
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
