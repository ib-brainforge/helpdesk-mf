import { type FC, useState } from 'react';
import {
  BaseModal,
  BaseModalContent,
  BaseModalHeader,
  BaseModalBody,
  BaseModalFooter,
  BaseButton,
  BaseSelect,
  BaseSelectItem,
} from '@brainforgeau/components';
import { useUsersData } from '@/components/users/hooks/useUsersData';

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (assigneeId: string | undefined) => void;
  ticketCount: number;
}

export const BulkAssignModal: FC<BulkAssignModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  ticketCount,
}) => {
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | undefined>(undefined);
  const { items: users } = useUsersData();

  const handleConfirm = () => {
    onConfirm(selectedAssigneeId);
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <BaseModalContent>
        <BaseModalHeader title="Assign Tickets">Assign Tickets</BaseModalHeader>
        <BaseModalBody>
          <p className="mb-4">
            Assign {ticketCount} ticket{ticketCount !== 1 ? 's' : ''} to:
          </p>
          <BaseSelect
            label="Assignee"
            placeholder="Select assignee (or leave unassigned)"
            selectedKeys={selectedAssigneeId ? new Set([selectedAssigneeId]) : new Set()}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string | undefined;
              setSelectedAssigneeId(value);
            }}
          >
            {users.map((user) => (
              <BaseSelectItem key={user.id}>
                {user.name}
              </BaseSelectItem>
            ))}
          </BaseSelect>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="bordered" onPress={onClose}>
            Cancel
          </BaseButton>
          <BaseButton color="primary" onPress={handleConfirm}>
            Assign
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
