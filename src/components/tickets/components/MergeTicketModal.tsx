import { type FC, useState, useCallback } from 'react';
import {
  BaseModal,
  BaseModalContent,
  BaseModalHeader,
  BaseModalBody,
  BaseModalFooter,
  BaseButton,
  BaseInput,
  Icon,
} from '@brainforgeau/components';
interface MergeTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetTicketId: string) => void;
  currentTicketId: string;
}

export const MergeTicketModal: FC<MergeTicketModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentTicketId,
}) => {
  const [targetTicketId, setTargetTicketId] = useState('');

  const handleConfirm = () => {
    if (targetTicketId.trim()) {
      onConfirm(targetTicketId.trim());
      setTargetTicketId('');
      onClose();
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <BaseModalContent>
        <BaseModalHeader title="Merge Ticket">Merge Ticket</BaseModalHeader>
        <BaseModalBody>
          <div className="mb-4 p-3 bg-warning-50 border border-warning-200 rounded text-warning-800">
            <p className="font-semibold">Warning</p>
            <p>This will merge the current ticket into another primary ticket. The current ticket will be closed
            and its subscribers copied to the primary ticket.</p>
          </div>
          <BaseInput
            label="Target Ticket ID"
            placeholder="Enter the ID of the ticket to merge into"
            value={targetTicketId}
            onChange={(e) => setTargetTicketId(e.target.value)}
            description="The ticket that will remain active after merge"
          />
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="bordered" onPress={onClose}>
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleConfirm}
            isDisabled={!targetTicketId.trim()}
          >
            Merge
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
