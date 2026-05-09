import {
  BaseButton,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@brainforgeau/components';
import type { ReactNode } from 'react';

export interface ConfirmActionModalProps {
  isOpen: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmActionModal({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  isLoading,
  onConfirm,
}: ConfirmActionModalProps) {
  return (
    <BaseModal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
      <BaseModalContent>
        {onClose => (
          <>
            <BaseModalHeader>{title}</BaseModalHeader>
            <BaseModalBody>{description}</BaseModalBody>
            <BaseModalFooter>
              <BaseButton variant="light" onPress={onClose}>
                {cancelLabel}
              </BaseButton>
              <BaseButton
                color={destructive ? 'danger' : 'primary'}
                isDisabled={isLoading}
                onPress={async () => {
                  try {
                    await onConfirm();
                  } finally {
                    onClose();
                  }
                }}
              >
                {confirmLabel}
              </BaseButton>
            </BaseModalFooter>
          </>
        )}
      </BaseModalContent>
    </BaseModal>
  );
}
