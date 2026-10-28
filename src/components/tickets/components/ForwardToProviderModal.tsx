import { ModalHeader } from '@/components/shared';
import {
  useForwardTicketToProvider,
  useProviderCategories,
} from '@/hooks/useProviderSupport';
import {
  BaseButton,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseSelect,
  BaseSelectItem,
} from '@brainforgeau/components';
import { toast } from '@heroui/react';
import { type FC, useEffect, useState } from 'react';

interface ForwardToProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  /** Called once the ticket has moved to the provider's office. */
  onForwarded: () => void;
}

/** "Use the provider's default": no category is sent. */
const NO_CATEGORY = 'none';

/**
 * Moves a ticket to the tenant's provider ("From customers" in the provider's
 * office). The ticket keeps its history and its submitter and leaves this
 * tenant's list. The category in the provider's office is optional.
 */
export const ForwardToProviderModal: FC<ForwardToProviderModalProps> = ({
  isOpen,
  onClose,
  ticketId,
  onForwarded,
}) => {
  const { data: categories = [], isLoading } = useProviderCategories(isOpen);
  const forward = useForwardTicketToProvider();
  const [categoryKey, setCategoryKey] = useState(NO_CATEGORY);

  useEffect(() => {
    if (isOpen) setCategoryKey(NO_CATEGORY);
  }, [isOpen]);

  const handleConfirm = () => {
    forward.mutate(
      {
        ticketId,
        categoryId: categoryKey === NO_CATEGORY ? undefined : categoryKey,
      },
      {
        onSuccess: () => {
          toast('Ticket forwarded to your provider', { variant: 'success' });
          onClose();
          onForwarded();
        },
        onError: () => {
          toast("Couldn't forward the ticket", {
            description: 'Please try again.',
            variant: 'danger',
          });
        },
      },
    );
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <BaseModalContent>
        <ModalHeader>Forward to provider</ModalHeader>
        <BaseModalBody>
          <p className="mb-4 text-sm text-default-600">
            The ticket moves to your provider's helpdesk with its history. It
            leaves this list, and you can follow it under Raised with our
            provider.
          </p>
          <BaseSelect
            label="Category (optional)"
            selectedKey={categoryKey}
            isDisabled={isLoading}
            onSelectionChange={key => {
              if (key) setCategoryKey(String(key));
            }}
          >
            {[
              <BaseSelectItem
                key={NO_CATEGORY}
                id={NO_CATEGORY}
                textValue="Let the provider choose"
              >
                Let the provider choose
              </BaseSelectItem>,
              ...categories.map(category => (
                <BaseSelectItem
                  key={category.id}
                  id={category.id}
                  textValue={category.name}
                >
                  {category.name}
                </BaseSelectItem>
              )),
            ]}
          </BaseSelect>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton
            variant="bordered"
            color="light"
            onPress={onClose}
            isDisabled={forward.isPending}
          >
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleConfirm}
            isDisabled={forward.isPending}
          >
            Forward
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
