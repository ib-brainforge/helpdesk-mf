import { useCustomStatuses } from '@/components/custom-statuses/hooks/useCustomStatuses';
import { buildStatusOptions, resolveStatusKey } from '@/types/custom-status';
import type { TicketStatus } from '@/types/ticket';
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
import { type FC, useMemo, useState } from 'react';

interface BulkStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * `customStatusId` is null for a built-in status, which is what detaches a
   * custom status from whichever selected tickets already had one.
   */
  onConfirm: (status: TicketStatus, customStatusId: string | null) => void;
  ticketCount: number;
}

export const BulkStatusModal: FC<BulkStatusModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  ticketCount,
}) => {
  const { customStatuses } = useCustomStatuses();
  // No current ticket to preserve a retired status for: a bulk action applies
  // one status to many tickets, so only the active ones are offerable.
  const statusOptions = useMemo(
    () => buildStatusOptions(customStatuses),
    [customStatuses],
  );

  // Holds the picker KEY, not a status: a custom selection is only resolved
  // into a status plus an id on confirm.
  const [selectedKey, setSelectedKey] = useState<string>('New');

  const handleConfirm = () => {
    const resolved = resolveStatusKey(selectedKey, customStatuses);
    // null means the custom status was deleted while the modal was open.
    if (!resolved) return;
    onConfirm(resolved.status as TicketStatus, resolved.customStatusId);
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
            selectedKey={selectedKey}
            onSelectionChange={keys => {
              if (typeof keys === 'string') setSelectedKey(keys);
            }}
          >
            {statusOptions.map(opt => (
              <BaseSelectItem key={opt.key} value={opt.key}>
                {opt.label}
              </BaseSelectItem>
            ))}
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
