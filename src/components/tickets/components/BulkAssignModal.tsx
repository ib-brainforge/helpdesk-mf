import { UserOptionRow } from '@/components/shared';
import {
  BaseAutocomplete,
  BaseAutocompleteItem,
  BaseAvatar,
  BaseButton,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@brainforgeau/components';
import { useAtom } from 'jotai';
import { type FC, useEffect, useMemo, useState } from 'react';
import {
  mapUserToOption,
  usersMutationAtom,
} from '../state/users-dropdown-state';

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** `null` unassigns the selected tickets. */
  onConfirm: (assigneeId: string | null) => void;
  ticketCount: number;
}

export const BulkAssignModal: FC<BulkAssignModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  ticketCount,
}) => {
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(
    null,
  );

  // Users search mutation for assignee autocomplete
  const [
    { mutate: searchUsers, data: usersData, isPending: isSearchingUsers },
  ] = useAtom(usersMutationAtom);

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
    [usersData],
  );

  const handleConfirm = () => {
    onConfirm(selectedAssigneeId ?? null);
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
            onSelectionChange={key => {
              const newKey = key as string | null;
              if (newKey !== selectedAssigneeId) {
                setSelectedAssigneeId(newKey);
              }
            }}
            onClear={() => setSelectedAssigneeId(null)}
            onValueChange={(value: string) => {
              searchUsers({ query: value });
            }}
            onOpenChange={open => {
              if (open && !isSearchingUsers) {
                searchUsers({ query: '' });
              }
            }}
            isLoading={isSearchingUsers}
            renderSelectedItem={selectedKey => {
              const user = usersOptions.find(u => u.id === selectedKey);
              if (!user) return null;
              return (
                <div className="flex w-full min-w-0 flex-1 items-center gap-2">
                  <BaseAvatar src={user.avatarUrl} name={user.name} size="xs" />
                  <span className="truncate text-xs font-medium">
                    {user.name}
                  </span>
                </div>
              );
            }}
          >
            {usersOptions.map(user => (
              <BaseAutocompleteItem
                key={user.id}
                id={user.id}
                textValue={user.name}
              >
                <UserOptionRow
                  name={user.name}
                  email={user.email}
                  avatarUrl={user.avatarUrl}
                />
              </BaseAutocompleteItem>
            ))}
          </BaseAutocomplete>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="bordered" onPress={handleClose}>
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleConfirm}
            isDisabled={!selectedAssigneeId}
          >
            Assign
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
