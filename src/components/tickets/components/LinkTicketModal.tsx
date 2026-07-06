import {
  BaseButton,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
  BaseSelect,
  BaseSelectItem,
} from '@brainforgeau/components';
import { type FC, useState } from 'react';

interface LinkTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetTicketId: string, linkType: string) => void;
  currentTicketId: string;
}

const LINK_TYPES = [
  { value: 'relates-to', label: 'Relates To' },
  { value: 'blocks', label: 'Blocks' },
  { value: 'is-blocked-by', label: 'Is Blocked By' },
  { value: 'duplicates', label: 'Duplicates' },
  { value: 'is-duplicated-by', label: 'Is Duplicated By' },
];

export const LinkTicketModal: FC<LinkTicketModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentTicketId,
}) => {
  const [targetTicketId, setTargetTicketId] = useState('');
  const [linkType, setLinkType] = useState('relates-to');

  const handleConfirm = () => {
    if (targetTicketId.trim()) {
      onConfirm(targetTicketId.trim(), linkType);
      setTargetTicketId('');
      setLinkType('relates-to');
      onClose();
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <BaseModalContent>
        <BaseModalHeader title="Link Ticket">Link Ticket</BaseModalHeader>
        <BaseModalBody>
          <div className="space-y-4">
            <BaseSelect
              label="Link Type"
              selectedKey={linkType}
              onSelectionChange={keys => {
                const value = keys as string;
                setLinkType(value);
              }}
            >
              {LINK_TYPES.map(type => (
                <BaseSelectItem key={type.value} value={type.value}>
                  {type.label}
                </BaseSelectItem>
              ))}
            </BaseSelect>
            <BaseInput
              label="Target Ticket ID"
              placeholder="Enter the ID of the ticket to link"
              value={targetTicketId}
              onChange={e => setTargetTicketId(e.target.value)}
            />
          </div>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="bordered" onPress={onClose}>
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleConfirm}
            isDisabled={!targetTicketId.trim()}
          >
            Link
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
