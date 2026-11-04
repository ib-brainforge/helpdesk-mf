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
import { type FC, useMemo, useState } from 'react';
import {
  type AssigneeScope,
  useScopedAssigneesIntersection,
} from '../hooks/useScopedAssignees';
import { moreAssigneesItem } from './moreAssigneesItem';

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** `null` unassigns the selected tickets. */
  onConfirm: (assigneeId: string | null, assigneeName?: string | null) => void;
  ticketCount: number;
  /**
   * The scope of each selected ticket. Only people who can work every one of
   * them are offered, so a bulk assignment never lands someone on a ticket
   * outside their reach.
   */
  scopes: AssigneeScope[];
}

export const BulkAssignModal: FC<BulkAssignModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  ticketCount,
  scopes,
}) => {
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(
    null,
  );

  const [query, setQuery] = useState('');

  // The modal stays mounted under the grid, so it loads only while open.
  const assignees = useScopedAssigneesIntersection(scopes, {
    enabled: isOpen,
    search: query,
    selectedIds: selectedAssigneeId ? [selectedAssigneeId] : [],
  });
  const usersOptions = assignees.options;

  // Counted by organisation, the unit the message below talks about. Tickets
  // with no organisation belong to their tenant as a whole and are not counted.
  const orgCount = useMemo(
    () => new Set(scopes.map(s => s.organisationId).filter(Boolean)).size,
    [scopes],
  );
  const nobodyInCommon =
    !assignees.isLoading &&
    !assignees.isError &&
    assignees.scopeCount > 1 &&
    !query.trim() &&
    assignees.options.length === 0;

  const handleConfirm = () => {
    onConfirm(
      selectedAssigneeId ?? null,
      assignees.options.find(u => u.id === selectedAssigneeId)?.name ?? null,
    );
    setSelectedAssigneeId(null);
    setQuery('');
    onClose();
  };

  const handleClose = () => {
    setSelectedAssigneeId(null);
    setQuery('');
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose}>
      <BaseModalContent>
        <BaseModalHeader title="Assign Tickets" windowControls={false} />
        <BaseModalBody>
          <p className="mb-4">
            Assign {ticketCount} ticket{ticketCount !== 1 ? 's' : ''} to:
          </p>
          {assignees.tooManyScopes ? (
            <p className="mb-4 text-sm text-muted-foreground">
              Selection spans too many organisations or divisions; narrow the
              selection.
            </p>
          ) : assignees.isError ? (
            <p className="mb-4 text-sm text-danger">
              Couldn't load the people who can work this selection. Close and
              try again.
            </p>
          ) : null}
          {nobodyInCommon ? (
            <p className="mb-4 text-sm text-muted-foreground">
              No one belongs to{' '}
              {orgCount === 2
                ? 'both'
                : `all ${orgCount > 2 ? orgCount : 'the'}`}{' '}
              organisations in this selection. Narrow the selection to one
              organisation to assign.
            </p>
          ) : null}
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
            isDisabled={
              nobodyInCommon || assignees.isError || assignees.tooManyScopes
            }
            onValueChange={setQuery}
            onOpenChange={open => {
              if (!open) setQuery('');
            }}
            isLoading={assignees.isLoading}
            renderSelectedItem={selectedKey => {
              const user = assignees.options.find(u => u.id === selectedKey);
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
            {[
              ...usersOptions.map(user => (
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
              )),
              ...(assignees.hasMore ? [moreAssigneesItem()] : []),
            ]}
          </BaseAutocomplete>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="bordered" color="light" onPress={handleClose}>
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
