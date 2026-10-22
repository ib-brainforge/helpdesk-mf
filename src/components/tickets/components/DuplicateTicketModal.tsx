import { ModalHeader } from '@/components/shared';
import {
  BaseButton,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
} from '@brainforgeau/components';
import type { FC } from 'react';

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
        <ModalHeader>Duplicate Ticket</ModalHeader>
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
            color="light"
            onPress={onClose}
            isDisabled={isLoading || isLoading}
          >
            Cancel
          </BaseButton>
          <BaseButton color="primary" onPress={onConfirm}>
            Duplicate
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
