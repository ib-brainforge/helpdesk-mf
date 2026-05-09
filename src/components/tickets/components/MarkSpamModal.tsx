import { BaseButton, BaseModal, BaseModalContent, BaseModalBody, BaseModalHeader, BaseModalFooter } from '@brainforgeau/components';

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
    <BaseModal isOpen={isOpen} onClose={onClose} size="sm">
      <BaseModalContent>
        <BaseModalHeader>Mark As Spam</BaseModalHeader>
        <BaseModalBody>
          <p className="text-default-600">
            This ticket will be marked as spam and removed from normal ticket
            views. You can view and restore spam tickets from the spam filter.
          </p>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton
            variant="bordered"
            onPress={onClose}
            isDisabled={isLoading}
          >
            Cancel
          </BaseButton>
          <BaseButton color="warning" onPress={onConfirm} isDisabled={isLoading}>
            Mark As Spam
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
