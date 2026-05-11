import { TicketStatus } from '@/types/ticket';
import {
  BaseButton,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
  BaseSelect,
  BaseSelectItem,
} from '@brainforgeau/components';
import { type FC, useState } from 'react';

interface BulkStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (status: TicketStatus) => void;
  ticketCount: number;
}

export const BulkStatusModal: FC<BulkStatusModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  ticketCount,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>(
    TicketStatus.New,
  );

  const handleConfirm = () => {
    onConfirm(selectedStatus);
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <BaseModalContent>
        <BaseModalHeader title="Change Status">Change Status</BaseModalHeader>
        <BaseModalBody>
          <p className="mb-4">
            Change status for {ticketCount} ticket{ticketCount !== 1 ? 's' : ''}{' '}
            to:
          </p>
          <BaseSelect
            label="Status"
            selectedKey={selectedStatus}
            onSelectionChange={keys => {
              const value = keys as string;
              setSelectedStatus(value as TicketStatus);
            }}
          >
            <BaseSelectItem key={TicketStatus.New}>New</BaseSelectItem>
            <BaseSelectItem key={TicketStatus.InProgress}>
              In Progress
            </BaseSelectItem>
            <BaseSelectItem key={TicketStatus.Closed}>Closed</BaseSelectItem>
          </BaseSelect>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="bordered" onPress={onClose}>
            Cancel
          </BaseButton>
          <BaseButton color="primary" onPress={handleConfirm}>
            Update Status
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
