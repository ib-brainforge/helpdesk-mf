import {
  BaseButton,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@brainforgeau/components';

import { type FC, useEffect, useState } from 'react';
import { toast } from '@heroui/react';
import { useUpdateTicket } from '../hooks/useTickets';

interface EditTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  initialSubject: string;
  initialDescription: string | null | undefined;
}

export const EditTicketModal: FC<EditTicketModalProps> = ({
  isOpen,
  onClose,
  ticketId,
  initialSubject,
  initialDescription,
}) => {
  const [subject, setSubject] = useState(initialSubject);
  const [description, setDescription] = useState(initialDescription ?? '');
  const updateMutation = useUpdateTicket();

  useEffect(() => {
    if (isOpen) {
      setSubject(initialSubject);
      setDescription(initialDescription ?? '');
    }
  }, [isOpen, initialSubject, initialDescription]);

  const handleConfirm = () => {
    if (!subject.trim()) return;
    updateMutation.mutate(
      {
        id: ticketId,
        updates: {
          subject: subject.trim(),
          description: description.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast('Ticket updated', { description: 'Subject and description saved.', variant: 'success' });
          onClose();
        },
        onError: () => {
          toast('Error', { description: 'Failed to update ticket. Please try again.', variant: 'danger' });
        },
      },
    );
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <BaseModalContent>
        <BaseModalHeader title="Edit Ticket">Edit Ticket</BaseModalHeader>
        <BaseModalBody>
          <div className="space-y-4">
            <BaseInput
              label="Subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              isRequired
            />
            <BaseInput
              label="Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton
            variant="bordered"
            onPress={onClose}
            isDisabled={updateMutation.isPending || updateMutation.isPending}
          >
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleConfirm}
            isDisabled={!subject.trim()}

          >
            Save
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
