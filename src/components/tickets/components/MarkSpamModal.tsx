import { BaseButton } from '@brainforgeau/components';
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@heroui/react';

interface MarkSpamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const MarkSpamModal: React.FC<MarkSpamModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalContent>
        <ModalHeader>Mark As Spam</ModalHeader>
        <ModalBody>
          <p className="text-default-600">
            This ticket will be marked as spam and removed from normal ticket
            views. You can view and restore spam tickets from the spam filter.
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
          <BaseButton color="warning" onPress={onConfirm} isLoading={isLoading}>
            Mark As Spam
          </BaseButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
