import { type FC, useState, useCallback, useMemo, useEffect } from 'react';
import {
  BaseModal,
  BaseModalContent,
  BaseModalHeader,
  BaseModalBody,
  BaseModalFooter,
  BaseButton,
  BaseInput,
  BaseTextarea,
  BaseSelect,
  BaseSelectItem,
  BaseAutocomplete,
  BaseAutocompleteItem,
  BaseAvatar,
} from '@brainforgeau/components';
import { addToast } from '@heroui/react';
import { useCreateTicket } from '../hooks/useTickets';
import { TicketPriority, type CreateTicketDto } from '@/types/ticket';
import { TagInput } from '@/components/tags/TagInput';
import { useTags } from '@/components/tags/hooks/useTags';
import { useAtom } from 'jotai';
import { usersMutationAtom, mapUserToOption } from '../state/users-dropdown-state';
import { categoriesMutationAtom, mapCategoryToOption } from '../state/categories-dropdown-state';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (ticketId: string) => void;
}

export const NewTicketModal: FC<NewTicketModalProps> = ({ isOpen, onClose, onCreated }) => {
  const createTicketMutation = useCreateTicket();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.Normal);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { tags: availableTags } = useTags();

  const [{ mutate: searchUsers, data: usersData, isPending: isSearchingUsers }] = useAtom(usersMutationAtom);
  const [{ mutate: searchCategories, data: categoriesData, isPending: isSearchingCategories }] = useAtom(categoriesMutationAtom);

  useEffect(() => {
    if (isOpen) {
      searchUsers({ query: '' });
      searchCategories({ query: '' });
    }
  }, [isOpen, searchUsers, searchCategories]);

  const usersOptions = useMemo(
    () => (usersData ?? []).map(mapUserToOption),
    [usersData]
  );

  const categoriesOptions = useMemo(
    () => (categoriesData ?? []).map(mapCategoryToOption),
    [categoriesData]
  );

  const resetForm = useCallback(() => {
    setSubject('');
    setDescription('');
    setPriority(TicketPriority.Normal);
    setCategoryId(undefined);
    setAssigneeId(undefined);
    setSelectedTags([]);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!subject.trim()) {
      addToast({
        title: 'Subject required',
        description: 'Please enter a ticket subject',
        severity: 'warning',
      });
      return;
    }
    if (!description.trim()) {
      addToast({
        title: 'Description required',
        description: 'Please enter a ticket description',
        severity: 'warning',
      });
      return;
    }

    try {
      const dto: CreateTicketDto = {
        subject,
        description,
        priority,
        categoryId,
        assigneeId,
        tags: selectedTags,
      };

      const result: any = await createTicketMutation.mutateAsync(dto);

      addToast({
        title: 'Ticket created',
        description: `Ticket "${subject}" has been created`,
        severity: 'success',
      });

      resetForm();
      onClose();

      if (result?.id) {
        onCreated?.(result.id);
      }
    } catch (error) {
      addToast({
        title: 'Failed to create ticket',
        description: error instanceof Error ? error.message : 'An error occurred',
        severity: 'danger',
      });
    }
  }, [subject, description, priority, categoryId, assigneeId, selectedTags, createTicketMutation, resetForm, onClose, onCreated]);

  const handleCancel = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  return (
    <BaseModal isOpen={isOpen} onClose={handleCancel} size="3xl" scrollBehavior="inside">
      <BaseModalContent>
        <BaseModalHeader title="New Ticket" onClose={handleCancel} />
        <BaseModalBody>
          <div className="space-y-4">
            <BaseInput
              label="Subject"
              isRequired
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter ticket subject"
            />

            <BaseTextarea
              label="Description"
              isRequired
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail"
              minRows={4}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BaseSelect
                label="Priority"
                isRequired
                selectedKeys={new Set([priority])}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as string;
                  setPriority(value as TicketPriority);
                }}
              >
                <BaseSelectItem key={TicketPriority.Critical}>Critical</BaseSelectItem>
                <BaseSelectItem key={TicketPriority.High}>High</BaseSelectItem>
                <BaseSelectItem key={TicketPriority.Normal}>Normal</BaseSelectItem>
                <BaseSelectItem key={TicketPriority.Low}>Low</BaseSelectItem>
                <BaseSelectItem key={TicketPriority.None}>None</BaseSelectItem>
              </BaseSelect>

              <BaseAutocomplete
                label="Category"
                placeholder="Select category (optional)"
                isClearable
                selectedKey={categoryId ?? null}
                onSelectionChange={(key) => setCategoryId((key as string) || undefined)}
                onClear={() => setCategoryId(undefined)}
                onValueChange={(value: string) => searchCategories({ query: value })}
                onOpenChange={(open) => {
                  if (open && !isSearchingCategories) {
                    searchCategories({ query: '' });
                  }
                }}
                isLoading={isSearchingCategories}
                renderSelectedItem={(selectedKey) => {
                  const category = categoriesOptions.find((c) => c.id === selectedKey);
                  if (!category) return null;
                  return (
                    <span className="truncate text-xs font-medium">
                      {category.sectionName ? `${category.sectionName} / ${category.name}` : category.name}
                    </span>
                  );
                }}
              >
                {categoriesOptions.map((category) => (
                  <BaseAutocompleteItem
                    key={category.id}
                    textValue={category.sectionName ? `${category.sectionName} / ${category.name}` : category.name}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-[#59636E] dark:text-white">{category.name}</span>
                      {category.sectionName && (
                        <span className="text-[10px] text-[#8C8F97] dark:text-gray-400">{category.sectionName}</span>
                      )}
                    </div>
                  </BaseAutocompleteItem>
                ))}
              </BaseAutocomplete>
            </div>

            <BaseAutocomplete
              label="Assignee"
              placeholder="Select assignee (optional)"
              isClearable
              selectedKey={assigneeId ?? null}
              onSelectionChange={(key) => setAssigneeId((key as string) || undefined)}
              onClear={() => setAssigneeId(undefined)}
              onValueChange={(value: string) => searchUsers({ query: value })}
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
                    <BaseAvatar src={user.avatarUrl} name={user.name} size="xs" />
                    <span className="truncate text-xs font-medium">{user.name}</span>
                  </div>
                );
              }}
            >
              {usersOptions.map((user) => (
                <BaseAutocompleteItem key={user.id} textValue={user.name}>
                  <div className="flex items-center gap-2.5">
                    <BaseAvatar src={user.avatarUrl} name={user.name} size="xs" />
                    <div className="flex-1">
                      <span className="text-xs text-[#59636E] dark:text-white">{user.name}</span>
                      {user.email && (
                        <span className="dark:text-light block text-[10px] text-[#8C8F97]">{user.email}</span>
                      )}
                    </div>
                  </div>
                </BaseAutocompleteItem>
              ))}
            </BaseAutocomplete>

            <TagInput
              selectedTags={selectedTags}
              availableTags={availableTags}
              onTagsChange={setSelectedTags}
            />
          </div>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="bordered" onPress={handleCancel}>
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleCreate}
            isLoading={createTicketMutation.isPending}
          >
            Create Ticket
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
