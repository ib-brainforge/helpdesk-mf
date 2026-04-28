import { type FC, useCallback, useState, useMemo, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { useNavigate } from '@modern-js/runtime/router';
import {
  BaseButton,
  BaseInput,
  BaseTextarea,
  BaseSelect,
  BaseSelectItem,
  BaseAutocomplete,
  BaseAutocompleteItem,
  BaseAvatar,
  Icon,
} from '@brainforgeau/components';
import { useCreateTicket } from '../hooks/useTickets';
import { TicketPriority, type CreateTicketDto } from '@/types/ticket';
import { TagInput } from '@/components/tags/TagInput';
import { FileUploadZone } from '@/components/file-upload/FileUploadZone';
import { AttachmentList } from '@/components/file-upload/AttachmentList';
import { useTags } from '@/components/tags/hooks/useTags';
import { useUploadAttachment } from '@/components/attachments/hooks/useAttachments';
import type { AttachmentDto } from '@/types';
import { addToast } from '@heroui/react';
import { useAtom } from 'jotai';
import { usersMutationAtom, mapUserToOption } from '../state/users-dropdown-state';
import { categoriesMutationAtom, mapCategoryToOption } from '../state/categories-dropdown-state';

const createTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject is too long'),
  description: z.string().min(1, 'Description is required'),
  priority: z.nativeEnum(TicketPriority),
  categoryId: z.string().optional(),
  assigneeId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type CreateTicketFormData = z.infer<typeof createTicketSchema>;

export const NewTicketForm: FC = () => {
  const navigate = useNavigate();
  const createTicketMutation = useCreateTicket();

  // Tags
  const { tags: availableTags } = useTags();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Attachments - REVIEW: Store files locally until ticket is created
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const { uploadFiles, uploadProgress } = useUploadAttachment();

  // Users search mutation for assignee autocomplete
  const [{ mutate: searchUsers, data: usersData, isPending: isSearchingUsers }] = useAtom(usersMutationAtom);

  // Categories search mutation for category autocomplete
  const [{ mutate: searchCategories, data: categoriesData, isPending: isSearchingCategories }] = useAtom(categoriesMutationAtom);

  // Load initial data when component mounts
  useEffect(() => {
    searchUsers({ query: '' });
    searchCategories({ query: '' });
  }, [searchUsers, searchCategories]);

  // Map data to options
  const usersOptions = useMemo(
    () => (usersData ?? []).map(mapUserToOption),
    [usersData]
  );

  const categoriesOptions = useMemo(
    () => (categoriesData ?? []).map(mapCategoryToOption),
    [categoriesData]
  );

  const form = useForm({
    defaultValues: {
      subject: '',
      description: '',
      priority: TicketPriority.Normal,
      categoryId: undefined,
      assigneeId: undefined,
      tags: [],
    } as CreateTicketFormData,
    onSubmit: async ({ value }) => {
      try {
        const dto: CreateTicketDto = {
          subject: value.subject,
          description: value.description,
          priority: value.priority,
          categoryId: value.categoryId,
          assigneeId: value.assigneeId,
          tags: selectedTags,
        };

        const result: any = await createTicketMutation.mutateAsync(dto);

        // REVIEW: Upload attachments after ticket is created
        if (result?.id && pendingFiles.length > 0) {
          await uploadFiles(pendingFiles, result.id, undefined);
        }

        // Navigate to the new ticket detail page
        if (result?.id) {
          navigate(`/tickets/${result.id}`);
        } else {
          // Fallback - go back to list
          navigate('/tickets');
        }
      } catch (error) {
        console.error('Failed to create ticket:', error);
        addToast({
          title: 'Failed to create ticket',
          description: error instanceof Error ? error.message : 'An error occurred while creating the ticket',
          severity: 'danger',
        });
      }
    },
  });

  const handleCancel = useCallback(() => {
    navigate('/tickets');
  }, [navigate]);

  const handleFilesSelected = useCallback((files: File[]) => {
    setPendingFiles(prev => [...prev, ...files]);
  }, []);

  const handleRemoveFile = useCallback((fileName: string) => {
    setPendingFiles(prev => prev.filter(f => f.name !== fileName));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Create New Ticket</h1>
      </div>

      {/* Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        {/* Subject */}
        <form.Field name="subject">
          {(field) => (
            <div>
              <BaseInput
                label="Subject"
                isRequired
                placeholder="Enter ticket subject"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {/* TODO: Similar KB article suggestions as user types */}
            </div>
          )}
        </form.Field>

        {/* Description */}
        <form.Field name="description">
          {(field) => (
            <BaseTextarea
              label="Description"
              isRequired
              placeholder="Describe the issue in detail"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              minRows={6}
              description="Use the textarea to describe the issue in detail"
            />
          )}
        </form.Field>

        {/* Priority and Category - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Priority */}
          <form.Field name="priority">
            {(field) => (
              <BaseSelect
                label="Priority"
                isRequired
                selectedKeys={new Set([field.state.value])}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as string;
                  field.handleChange(value as TicketPriority);
                }}
              >
                <BaseSelectItem key={TicketPriority.Critical}>Critical</BaseSelectItem>
                <BaseSelectItem key={TicketPriority.High}>High</BaseSelectItem>
                <BaseSelectItem key={TicketPriority.Normal}>Normal</BaseSelectItem>
                <BaseSelectItem key={TicketPriority.Low}>Low</BaseSelectItem>
                <BaseSelectItem key={TicketPriority.None}>None</BaseSelectItem>
              </BaseSelect>
            )}
          </form.Field>

          {/* Category */}
          <form.Field name="categoryId">
            {(field) => (
              <BaseAutocomplete
                label="Category"
                placeholder="Search category (optional)..."
                isClearable
                selectedKey={field.state.value ?? null}
                onSelectionChange={(key) => {
                  const newKey = key as string | null;
                  field.handleChange(newKey ?? undefined);
                }}
                onClear={() => field.handleChange(undefined)}
                onValueChange={(value: string) => {
                  searchCategories({ query: value });
                }}
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
                      <span className="text-xs text-[#59636E] dark:text-white">
                        {category.name}
                      </span>
                      {category.sectionName && (
                        <span className="text-[10px] text-[#8C8F97] dark:text-gray-400">
                          {category.sectionName}
                        </span>
                      )}
                    </div>
                  </BaseAutocompleteItem>
                ))}
              </BaseAutocomplete>
            )}
          </form.Field>
        </div>

        {/* Assignee */}
        <form.Field name="assigneeId">
          {(field) => (
            <BaseAutocomplete
              label="Assignee"
              placeholder="Search assignee (optional)..."
              isClearable
              selectedKey={field.state.value ?? null}
              onSelectionChange={(key) => {
                const newKey = key as string | null;
                field.handleChange(newKey ?? undefined);
              }}
              onClear={() => field.handleChange(undefined)}
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
          )}
        </form.Field>

        {/* Tags */}
        <TagInput
          selectedTags={selectedTags}
          availableTags={availableTags}
          onTagsChange={setSelectedTags}
        />

        {/* File Attachments */}
        <div>
          <label className="block text-sm font-medium mb-2">Attachments</label>
          <div className="space-y-4">
            <FileUploadZone
              onFilesSelected={handleFilesSelected}
              progress={uploadProgress}
            />

            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Pending uploads ({pendingFiles.length} files):</p>
                {pendingFiles.map((file) => (
                  <div key={file.name} className="flex items-center justify-between rounded border p-2">
                    <span className="text-sm truncate">{file.name}</span>
                    <BaseButton
                      size="sm"
                      variant="light"
                      color="danger"
                      onPress={() => handleRemoveFile(file.name)}
                      icon={<Icon name="trash" className="h-3 w-3" />}
                    >
                      Remove
                    </BaseButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t">
          <BaseButton
            variant="bordered"
            onPress={handleCancel}
            isDisabled={createTicketMutation.isPending}
          >
            Cancel
          </BaseButton>
          <BaseButton
            type="submit"
            color="primary"
            isLoading={createTicketMutation.isPending}
            icon={<Icon name="check" className="h-4 w-4" />}
          >
            Create Ticket
          </BaseButton>
        </div>
      </form>
    </div>
  );
};
