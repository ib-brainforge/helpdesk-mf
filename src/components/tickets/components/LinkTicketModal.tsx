import { ModalHeader } from '@/components/shared';
import {
  TICKET_LINK_OPTIONS,
  type TicketLinkSemantic,
} from '@/types/ticket-links';
import {
  BaseButton,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseSelect,
  BaseSelectItem,
} from '@brainforgeau/components';
import { type FC, useState } from 'react';

interface LinkTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetTicketId: string, linkType: TicketLinkSemantic) => void;
  currentTicketId: string;
}

export const LinkTicketModal: FC<LinkTicketModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentTicketId,
}) => {
  const [targetTicketId, setTargetTicketId] = useState('');
  // The phrases live with the wire mapping in @/types/ticket-links, so the
  // options a person sees and the (source, target, type) they turn into cannot
  // drift apart. They previously lived here and matched nothing the API knew.
  const [linkType, setLinkType] = useState<TicketLinkSemantic>('relates-to');

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
        <ModalHeader>Link Ticket</ModalHeader>
        <BaseModalBody>
          <div className="space-y-4">
            <BaseSelect
              label="Link Type"
              selectedKey={linkType}
              onSelectionChange={keys => {
                const value = keys as string;
                setLinkType(value as TicketLinkSemantic);
              }}
            >
              {TICKET_LINK_OPTIONS.map(type => (
                <BaseSelectItem
                  key={type.value}
                  value={type.value}
                  textValue={type.label}
                >
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
          <BaseButton variant="bordered" color="light" onPress={onClose}>
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
