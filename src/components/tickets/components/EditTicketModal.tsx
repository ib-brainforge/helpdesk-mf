import {
  BaseButton,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@brainforgeau/components';
import { addToast } from '@heroui/react';
import { type FC, useEffect, useState } from 'react';
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
          addToast({
            title: 'Ticket updated',
            description: 'Subject and description saved.',
            severity: 'success',
          });
          onClose();
        },
        onError: () => {
          addToast({
            title: 'Error',
            description: 'Failed to update ticket. Please try again.',
            severity: 'danger',
          });
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
            isDisabled={updateMutation.isPending}
          >
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleConfirm}
            isDisabled={!subject.trim()}
            isLoading={updateMutation.isPending}
          >
            Save
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
