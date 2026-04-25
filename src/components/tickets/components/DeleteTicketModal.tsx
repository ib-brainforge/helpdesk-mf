import { BaseButton } from '@brainforgeau/components';
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@heroui/react';

interface DeleteTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const DeleteTicketModal: React.FC<DeleteTicketModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalContent>
        <ModalHeader>Delete Ticket</ModalHeader>
        <ModalBody>
          <p className="text-default-600">
            This ticket will be moved to trash and can be restored within 30
            days from the audit log.
          </p>
        </ModalBody>
        <ModalFooter>
          <BaseButton
            variant="bordered"
            onPress={onClose}
            isDisabled={isLoading}
          >
            Cancel
          </BaseButton>
          <BaseButton color="danger" onPress={onConfirm} isLoading={isLoading}>
            Delete
          </BaseButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
