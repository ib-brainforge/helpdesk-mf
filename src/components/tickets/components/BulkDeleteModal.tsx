import { type FC } from 'react';
import {
  BaseModal,
  BaseModalContent,
  BaseModalHeader,
  BaseModalBody,
  BaseModalFooter,
  BaseButton,
} from '@brainforgeau/components';
interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  ticketCount: number;
}

export const BulkDeleteModal: FC<BulkDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  ticketCount,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <BaseModalContent>
        <BaseModalHeader title="Delete Tickets">Delete Tickets</BaseModalHeader>
        <BaseModalBody>
          <div className="mb-4 p-3 bg-warning-50 border border-warning-200 rounded text-warning-800">
            <p className="font-semibold">Warning</p>
            <p>This action will permanently delete {ticketCount} ticket{ticketCount !== 1 ? 's' : ''}.</p>
          </div>
          <p>Are you sure you want to continue?</p>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="bordered" onPress={onClose}>
            Cancel
          </BaseButton>
          <BaseButton color="danger" onPress={handleConfirm}>
            Delete
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
