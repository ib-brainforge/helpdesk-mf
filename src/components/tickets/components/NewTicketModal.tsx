import {
  BaseAutocomplete,
  BaseAutocompleteItem,
  BaseAvatar,
  BaseButton,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
  BaseSelect,
  BaseSelectItem,
  BaseTextarea,
  ValidationAlert,
} from '@brainforgeau/components';
import { toast } from '@heroui/react';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';

import { TagInput } from '@/components/tags/TagInput';
import { useTags } from '@/components/tags/hooks/useTags';
import { type CreateTicketDto, TicketPriority } from '@/types/ticket';
import { useAtom } from 'jotai';
import { useCreateTicket } from '../hooks/useTickets';
import {
  categoriesMutationAtom,
  mapCategoryToOption,
} from '../state/categories-dropdown-state';
import {
  mapUserToOption,
  usersMutationAtom,
} from '../state/users-dropdown-state';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (ticketId: string) => void;
}

/** Extract a human-readable error message from a ProblemDetails-style axios error. */
function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const axiosError = error as {
      response?: {
        data?: {
          errors?: Record<string, string[]> | string[];
          detail?: string;
          title?: string;
        };
      };
      message?: string;
    };
    const data = axiosError.response?.data;
    if (data?.errors) {
      // ProblemDetails validation errors: map of field→messages or flat array
      if (Array.isArray(data.errors)) {
        return data.errors.slice(0, 3).join(', ');
      }
      const fieldErrors = Object.values(data.errors).flat().slice(0, 3);
      if (fieldErrors.length > 0) {
        return fieldErrors.join(', ');
      }
    }
    if (data?.detail) return data.detail;
    if (data?.title) return data.title;
    if (axiosError.message) return axiosError.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred. Please try again.';
}

export const NewTicketModal: FC<NewTicketModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const createTicketMutation = useCreateTicket();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>(
    TicketPriority.Normal,
  );
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { tags: availableTags } = useTags();

  const [
    { mutate: searchUsers, data: usersData, isPending: isSearchingUsers },
  ] = useAtom(usersMutationAtom);
  const [
    {
      mutate: searchCategories,
      data: categoriesData,
      isPending: isSearchingCategories,
    },
  ] = useAtom(categoriesMutationAtom);

  useEffect(() => {
    if (isOpen) {
      searchUsers({ query: '' });
      searchCategories({ query: '' });
    }
  }, [isOpen, searchUsers, searchCategories]);

  const usersOptions = useMemo(
    () => (usersData ?? []).map(mapUserToOption),
    [usersData],
  );

  const categoriesOptions = useMemo(
    () => (categoriesData ?? []).map(mapCategoryToOption),
    [categoriesData],
  );

  const resetForm = useCallback(() => {
    setSubject('');
    setDescription('');
    setPriority(TicketPriority.Normal);
    setCategoryId(undefined);
    setAssigneeId(undefined);
    setSelectedTags([]);
    setSubmitError(null);
  }, []);

  const handleCreate = useCallback(async () => {
    // Clear any previous submission error before attempting again.
    setSubmitError(null);

    if (!subject.trim()) {
      toast('Subject required', {
        description: 'Please enter a ticket subject',
        variant: 'warning',
      });
      return;
    }
    if (!description.trim()) {
      toast('Description required', {
        description: 'Please enter a ticket description',
        variant: 'warning',
      });
      return;
    }
    if (!categoryId) {
      toast('Category required', {
        description: 'Please select a category for the ticket',
        variant: 'warning',
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

      toast('Ticket created', {
        description: `Ticket "${subject}" has been created`,
        variant: 'success',
      });

      resetForm();
      onClose();

      if (result?.id) {
        onCreated?.(result.id);
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      setSubmitError(errorMessage);
      toast('Failed to create ticket', {
        description: errorMessage,
        variant: 'danger',
      });
    }
  }, [
    subject,
    description,
    priority,
    categoryId,
    assigneeId,
    selectedTags,
    createTicketMutation,
    resetForm,
    onClose,
    onCreated,
  ]);

  const handleCancel = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleCancel}
      size="3xl"
      scrollBehavior="inside"
    >
      <BaseModalContent>
        <BaseModalHeader title="New Ticket" onClose={handleCancel} />
        <BaseModalBody>
          {submitError && (
            <ValidationAlert
              errors={[submitError]}
              onClose={() => setSubmitError(null)}
            />
          )}
          <div className="space-y-4">
            <BaseInput
              label="Subject"
              isRequired
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Enter ticket subject"
            />

            <BaseTextarea
              label="Description"
              isRequired
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the issue in detail"
              minRows={4}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BaseSelect
                label="Priority"
                isRequired
                selectedKey={priority}
                onSelectionChange={keys => {
                  const value = keys as string;
                  setPriority(value as TicketPriority);
                }}
              >
                <BaseSelectItem
                  key={TicketPriority.Critical}
                  value={TicketPriority.Critical}
                >
                  Critical
                </BaseSelectItem>
                <BaseSelectItem
                  key={TicketPriority.High}
                  value={TicketPriority.High}
                >
                  High
                </BaseSelectItem>
                <BaseSelectItem
                  key={TicketPriority.Normal}
                  value={TicketPriority.Normal}
                >
                  Normal
                </BaseSelectItem>
                <BaseSelectItem
                  key={TicketPriority.Low}
                  value={TicketPriority.Low}
                >
                  Low
                </BaseSelectItem>
                {/* No "None" option: it means nothing that Low does not already
                    mean, and both rendered as the same grey badge, so it was a
                    choice with no distinct meaning. The enum member is kept so any
                    historical or imported ticket still renders. */}
              </BaseSelect>

              <BaseAutocomplete
                label="Category"
                placeholder="Select category"
                isRequired
                isClearable
                selectedKey={categoryId ?? null}
                onSelectionChange={key =>
                  setCategoryId((key as string) || undefined)
                }
                onClear={() => setCategoryId(undefined)}
                onValueChange={(value: string) =>
                  searchCategories({ query: value })
                }
                onOpenChange={open => {
                  if (open && !isSearchingCategories) {
                    searchCategories({ query: '' });
                  }
                }}
                isLoading={isSearchingCategories}
                renderSelectedItem={selectedKey => {
                  const category = categoriesOptions.find(
                    c => c.id === selectedKey,
                  );
                  if (!category) return null;
                  return (
                    <span className="truncate text-xs font-medium">
                      {category.sectionName
                        ? `${category.sectionName} / ${category.name}`
                        : category.name}
                    </span>
                  );
                }}
              >
                {categoriesOptions.map(category => (
                  <BaseAutocompleteItem
                    key={category.id}
                    id={category.id}
                    textValue={
                      category.sectionName
                        ? `${category.sectionName} / ${category.name}`
                        : category.name
                    }
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-[#59636E] dark:text-white">
                        {category.name}
                      </span>
                      {category.sectionName && (
                        <span className="text-[10px] text-[#8C8F97] dark:text-default-400">
                          {category.sectionName}
                        </span>
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
              onSelectionChange={key =>
                setAssigneeId((key as string) || undefined)
              }
              onClear={() => setAssigneeId(undefined)}
              onValueChange={(value: string) => searchUsers({ query: value })}
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
              {usersOptions.map(user => (
                <BaseAutocompleteItem
                  key={user.id}
                  id={user.id}
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
            isDisabled={
              createTicketMutation.isPending ||
              !subject.trim() ||
              !description.trim() ||
              !categoryId
            }
          >
            Create Ticket
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
