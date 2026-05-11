import {
  BaseButton,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@brainforgeau/components';

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
    <BaseModal isOpen={isOpen} onClose={onClose} size="sm">
      <BaseModalContent>
        <BaseModalHeader>Delete Ticket</BaseModalHeader>
        <BaseModalBody>
          <p className="text-default-600">
            This ticket will be moved to trash and can be restored within 30
            days from the audit log.
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
          <BaseButton color="danger" onPress={onConfirm} isDisabled={isLoading}>
            Delete
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
