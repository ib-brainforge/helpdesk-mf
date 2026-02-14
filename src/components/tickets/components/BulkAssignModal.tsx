import { type FC, useState, useMemo, useEffect } from 'react';
import {
  BaseModal,
  BaseModalContent,
  BaseModalHeader,
  BaseModalBody,
  BaseModalFooter,
  BaseButton,
  BaseAutocomplete,
  BaseAutocompleteItem,
  BaseAvatar,
} from '@brainforgeau/components';
import { useAtom } from 'jotai';
import { usersMutationAtom, mapUserToOption } from '../state/users-dropdown-state';

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
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);

  // Users search mutation for assignee autocomplete
  const [{ mutate: searchUsers, data: usersData, isPending: isSearchingUsers }] = useAtom(usersMutationAtom);

  // Load initial users when modal opens
  useEffect(() => {
    if (isOpen) {
      searchUsers({ query: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Map users data to options for the autocomplete
  const usersOptions = useMemo(
    () => (usersData ?? []).map(mapUserToOption),
    [usersData]
  );

  const handleConfirm = () => {
    onConfirm(selectedAssigneeId ?? undefined);
    setSelectedAssigneeId(null);
    onClose();
  };

  const handleClose = () => {
    setSelectedAssigneeId(null);
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose}>
      <BaseModalContent>
        <BaseModalHeader title="Assign Tickets">Assign Tickets</BaseModalHeader>
        <BaseModalBody>
          <p className="mb-4">
            Assign {ticketCount} ticket{ticketCount !== 1 ? 's' : ''} to:
          </p>
          <BaseAutocomplete
            label="Assignee"
            placeholder="Search team member..."
            isClearable
            selectedKey={selectedAssigneeId}
            onSelectionChange={(key) => {
              const newKey = key as string | null;
              if (newKey !== selectedAssigneeId) {
                setSelectedAssigneeId(newKey);
              }
            }}
            onClear={() => setSelectedAssigneeId(null)}
            onValueChange={(value: string) => {
              searchUsers({ query: value });
            }}
            onOpenChange={(open) => {
              if (open && !isSearchingUsers) {
                searchUsers({ query: '' });
              }
            }}
            isLoading={isSearchingUsers}
            renderSelectedItem={(selectedKey) => {
              const user = usersOptions.find((u) => u.id === selectedKey);
              if (!user) return null;
              return (
                <div className="flex w-full min-w-0 flex-1 items-center gap-2">
                  <BaseAvatar
                    src={user.avatarUrl}
                    name={user.name}
                    size="xs"
                  />
                  <span className="truncate text-xs font-medium">
                    {user.name}
                  </span>
                </div>
              );
            }}
          >
            {usersOptions.map((user) => (
              <BaseAutocompleteItem
                key={user.id}
                textValue={user.name}
              >
                <div className="flex items-center gap-2.5">
                  <BaseAvatar
                    src={user.avatarUrl}
                    name={user.name}
                    size="xs"
                  />
                  <div className="flex-1">
                    <span className="text-xs text-[#59636E] dark:text-white">
                      {user.name}
                    </span>
                    {user.email && (
                      <span className="dark:text-light block text-[10px] text-[#8C8F97]">
                        {user.email}
                      </span>
                    )}
                  </div>
                </div>
              </BaseAutocompleteItem>
            ))}
          </BaseAutocomplete>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="bordered" onPress={handleClose}>
            Cancel
          </BaseButton>
          <BaseButton color="primary" onPress={handleConfirm} isDisabled={!selectedAssigneeId}>
            Assign
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
