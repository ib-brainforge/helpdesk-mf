import {
  BaseButton,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@brainforgeau/components';
import { type FC, useState } from 'react';

interface ConvertToReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (parentTicketId: string) => void;
  isLoading?: boolean;
  currentTicketId: string;
}

export const ConvertToReplyModal: FC<ConvertToReplyModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  currentTicketId,
}) => {
  const [parentTicketId, setParentTicketId] = useState('');

  const handleConfirm = () => {
    const trimmed = parentTicketId.trim();
    if (!trimmed || trimmed === currentTicketId) return;
    onConfirm(trimmed);
    setParentTicketId('');
  };

  const trimmed = parentTicketId.trim();
  const isInvalid = !!trimmed && trimmed === currentTicketId;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <BaseModalContent>
        <BaseModalHeader title="Convert To Reply">
          Convert To Reply
        </BaseModalHeader>
        <BaseModalBody>
          <div className="space-y-4">
            <div className="p-3 bg-warning-50 border border-warning-200 rounded text-warning-800">
              <p className="font-semibold">Warning</p>
              <p>
                The content of this ticket will be added as an internal note on
                the parent ticket. This ticket will then be soft-deleted.
              </p>
            </div>
            <BaseInput
              label="Parent Ticket ID"
              placeholder="Enter the ID of the parent ticket"
              value={parentTicketId}
              onChange={e => setParentTicketId(e.target.value)}
              description="This ticket will be converted into a comment on the parent"
              isInvalid={isInvalid}
              errorMessage={
                isInvalid ? 'Cannot convert a ticket into itself' : undefined
              }
              isRequired
            />
          </div>
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
            onPress={handleConfirm}
            isDisabled={!trimmed || isInvalid}
            isLoading={isLoading}
          >
            Convert
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
