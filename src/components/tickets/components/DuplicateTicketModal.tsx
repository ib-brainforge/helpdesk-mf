import {
  BaseButton,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@brainforgeau/components';
import { type FC } from 'react';

interface DuplicateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const DuplicateTicketModal: FC<DuplicateTicketModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="sm">
      <BaseModalContent>
        <BaseModalHeader title="Duplicate Ticket">
          Duplicate Ticket
        </BaseModalHeader>
        <BaseModalBody>
          <p className="text-default-600">
            This will create a copy of the ticket with "(copy)" appended to the
            subject. The duplicate will be in New status and will not include
            comments.
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
          <BaseButton
            color="primary"
            onPress={onConfirm}
            isLoading={isLoading}
          >
            Duplicate
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
