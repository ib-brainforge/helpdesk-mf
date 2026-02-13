import { type FC, useCallback, useState } from 'react';
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
import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';
import { useUsersData } from '@/components/users/hooks/useUsersData';
import { addToast } from '@heroui/react';

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

  // Load categories and users
  const { categories } = useCategoriesData();
  const { items: users } = useUsersData();

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
              <BaseSelect
                label="Category"
                placeholder="Select category (optional)"
                selectedKeys={field.state.value ? new Set([field.state.value]) : new Set()}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as string | undefined;
                  field.handleChange(value);
                }}
              >
                {categories.map((category) => (
                  <BaseSelectItem key={category.id}>
                    {category.sectionName ? `${category.sectionName} / ${category.name}` : category.name}
                  </BaseSelectItem>
                ))}
              </BaseSelect>
            )}
          </form.Field>
        </div>

        {/* Assignee */}
        <form.Field name="assigneeId">
          {(field) => (
            <BaseSelect
              label="Assignee"
              placeholder="Assign to (optional)"
              selectedKeys={field.state.value ? new Set([field.state.value]) : new Set()}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string | undefined;
                field.handleChange(value);
              }}
            >
              {users.map((user) => (
                <BaseSelectItem key={user.id}>
                  {user.name}
                </BaseSelectItem>
              ))}
            </BaseSelect>
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
