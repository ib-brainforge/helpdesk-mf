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

import { toast } from '@heroui/react';
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
          toast('Ticket forwarded', {
            description: `Sent to ${toEmails.join(', ')}`,
            variant: 'success',
          });
          onClose();
        },
        onError: (error: any) => {
          const errorCode = error?.response?.data?.errors?.[0]?.code;
          if (errorCode === 'EMAIL_SEND_FAILED') {
            toast('Email not configured', {
              description:
                'Configure email settings first before forwarding tickets.',
              variant: 'danger',
            });
          } else {
            toast('Error', {
              description: 'Failed to forward ticket. Please try again.',
              variant: 'danger',
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
              onValueChange={setTo}
              description="Separate multiple addresses with commas or spaces"
              isInvalid={!!to && !toValid}
              errorMessage={
                !!to && !toValid ? 'Enter valid email addresses' : undefined
              }
              isRequired
            />
            <BaseInput
              label="CC (optional)"
              placeholder="cc@example.com"
              value={cc}
              onValueChange={setCc}
              isInvalid={!!cc && !ccValid}
              errorMessage={
                !!cc && !ccValid ? 'Enter valid email addresses' : undefined
              }
            />
            <BaseInput
              label="Subject"
              value={subject}
              onValueChange={setSubject}
              isRequired
            />
            <BaseInput
              label="Message"
              value={body}
              onValueChange={setBody}
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
            isDisabled={forwardMutation.isPending || forwardMutation.isPending}
          >
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleConfirm}
            isDisabled={!toValid || !subject.trim() || !ccValid}
          >
            Send
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
