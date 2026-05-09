import {
  BaseButton,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@brainforgeau/components';
import { type FC, useState } from 'react';

interface AddParentTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (parentTicketId: string) => void;
  isLoading?: boolean;
  currentTicketId: string;
}

export const AddParentTicketModal: FC<AddParentTicketModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  currentTicketId,
}) => {
  const [parentTicketId, setParentTicketId] = useState('');

  const handleConfirm = () => {
    const trimmed = parentTicketId.trim();
    if (!trimmed || trimmed === currentTicketId) return;
    onConfirm(trimmed);
    setParentTicketId('');
  };

  const trimmed = parentTicketId.trim();
  const isInvalid = !!trimmed && trimmed === currentTicketId;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <BaseModalContent>
        <BaseModalHeader title="Add Parent Ticket">
          Add Parent Ticket
        </BaseModalHeader>
        <BaseModalBody>
          <div className="space-y-4">
            <p className="text-default-600 text-sm">
              Link this ticket as a child of another ticket. The backend
              validates that no circular hierarchy is created.
            </p>
            <BaseInput
              label="Parent Ticket ID"
              placeholder="Enter the ID of the parent ticket"
              value={parentTicketId}
              onChange={e => setParentTicketId(e.target.value)}
              isInvalid={isInvalid}
              errorMessage={
                isInvalid ? 'Cannot set a ticket as its own parent' : undefined
              }
              isRequired
            />
          </div>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton
            variant="bordered"
            onPress={onClose}
            isDisabled={isLoading || isLoading}
          >
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleConfirm}
            isDisabled={!trimmed || isInvalid}

          >
            Set Parent
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
