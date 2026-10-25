import { ModalHeader, UserOptionRow } from '@/components/shared';
import { useScopedAssignees } from '@/components/tickets/hooks/useScopedAssignees';
import type { CategoryDto } from '@/types/category';
import { extractErrorMessage, isServerError } from '@/utils/error-handling';
import {
  BaseAutocomplete,
  BaseAutocompleteItem,
  BaseAvatar,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
} from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { toast } from '@heroui/react';
import { type FC, useEffect, useMemo, useState } from 'react';
import { useSetCategoryDefaultAssignee } from '../hooks/useCategoryDefaults';

/** The "None" option's key; the API takes null. */
const NONE = '__none__';

interface DefaultAssigneeModalProps {
  /** The category being set; the modal is open while this is set. */
  category?: CategoryDto;
  principalId?: string;
  onClose: () => void;
}

/**
 * Who new tickets in a category go to when nobody is picked. One setting for
 * every company (a Netcorp routing rule), so presets can have it too even
 * though they are otherwise read only.
 */
export const DefaultAssigneeModal: FC<DefaultAssigneeModalProps> = ({
  category,
  principalId,
  onClose,
}) => {
  const isOpen = Boolean(category);
  const [selected, setSelected] = useState<string>(NONE);
  const [query, setQuery] = useState('');
  // No scope: everyone who can be assigned anywhere, which is the staff list.
  const assignees = useScopedAssignees({}, { enabled: isOpen });
  const save = useSetCategoryDefaultAssignee(principalId);

  useEffect(() => {
    if (category) setSelected(category.defaultAssigneeId ?? NONE);
  }, [category]);

  const options = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term
      ? assignees.options.filter(u => u.name.toLowerCase().includes(term))
      : assignees.options;
  }, [assignees.options, query]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const handleSave = () => {
    if (!category) return;
    save.mutate(
      {
        categoryId: category.id,
        assigneeId: selected === NONE ? null : selected,
      },
      {
        onSuccess: () => {
          toast('Default assignee saved', { variant: 'success' });
          handleClose();
        },
        onError: error => {
          if (isServerError(error)) return;
          toast("Couldn't save the default assignee", {
            description: extractErrorMessage(error, 'Try again.'),
            variant: 'danger',
          });
        },
      },
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      className="max-w-[448px]"
    >
      <BaseModalContent>
        <ModalHeader>Default assignee</ModalHeader>
        <BaseModalBody>
          <p className="text-default-600 mb-3 text-sm">
            New tickets in{' '}
            <span className="font-semibold">{category?.name}</span> go to this
            person when nobody else is picked. It applies to every tenant.
          </p>
          <BaseAutocomplete
            label="Default assignee"
            placeholder="Search team member..."
            selectedKey={selected}
            onSelectionChange={key => setSelected((key as string) ?? NONE)}
            onValueChange={setQuery}
            onOpenChange={open => {
              if (!open) setQuery('');
            }}
            isLoading={assignees.isLoading}
            renderSelectedItem={key => {
              if (key === NONE) return <span className="text-xs">None</span>;
              const user = assignees.options.find(u => u.id === key);
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
              <BaseAutocompleteItem key={NONE} id={NONE} textValue="None">
                <span className="text-default-600 text-sm">None</span>
              </BaseAutocompleteItem>,
              ...options.map(user => (
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
            ]}
          </BaseAutocomplete>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="bordered" onPress={handleClose}>
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleSave}
            isDisabled={save.isPending}
          >
            Save
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
