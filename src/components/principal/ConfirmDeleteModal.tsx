/**
 * ConfirmDeleteModal — reusable confirmation dialog for destructive actions.
 *
 * Replaces window.confirm() calls across all principal config list pages.
 * Use with useDisclosure() for open/close state.
 */

import {
  BaseButton,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@brainforgeau/components';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isPending?: boolean;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isPending = false,
}: ConfirmDeleteModalProps) {
  return (
    <BaseModal isOpen={isOpen} onOpenChange={open => !open && onClose()}>
      <BaseModalContent>
        {onModalClose => (
          <>
            <BaseModalHeader>{title}</BaseModalHeader>
            <BaseModalBody>
              <p className="text-sm text-default-600">{message}</p>
            </BaseModalBody>
            <BaseModalFooter>
              <BaseButton variant="light" onPress={onModalClose}>
                Cancel
              </BaseButton>
              <BaseButton
                color="danger"
                onPress={() => {
                  onConfirm();
                  onModalClose();
                }}
                isLoading={isPending}
              >
                Delete
              </BaseButton>
            </BaseModalFooter>
          </>
        )}
      </BaseModalContent>
    </BaseModal>
  );
}
