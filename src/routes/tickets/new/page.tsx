/**
 * New ticket page — /tickets/new
 *
 * W1-P8: Migrated to <FormPage> with useEntityForm.
 * Core ticket fields (subject, description, priority, categoryId, assigneeId)
 * are managed by useEntityForm/Zod. Tags and attachments are managed as local
 * React state because they are not part of the submit schema (processed
 * separately after ticket creation by the existing mutation logic).
 */

import { AppAuthSplash } from '@/components/AppSplash';
import { useUploadAttachment } from '@/components/attachments/hooks/useAttachments';
import { FileUploadZone } from '@/components/file-upload/FileUploadZone';
import { TagInput } from '@/components/tags/TagInput';
import { useTags } from '@/components/tags/hooks/useTags';
import {
  filterAssignees,
  useScopedAssignees,
} from '@/components/tickets/hooks/useScopedAssignees';
import { useCreateTicket } from '@/components/tickets/hooks/useTickets';
import {
  categoriesMutationAtom,
  mapCategoryToOption,
} from '@/components/tickets/state/categories-dropdown-state';
import { withAuthenticationRequired } from '@/security';
import { selectedContextAtom } from '@/state/auth-atoms';
import { TicketPriority } from '@/types/ticket';
import {
  BaseAutocomplete,
  BaseAutocompleteItem,
  BaseAvatar,
  BaseButton,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  BaseTextarea,
  Icon,
} from '@brainforgeau/components';
import { FormPage, useEntityForm } from '@brainforgeau/components/page';
import { useNavigate } from '@modern-js/runtime/router';
import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema — mirrors createTicketSchema in NewTicketForm.tsx
// ---------------------------------------------------------------------------

const newTicketSchema = z.object({
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject is too long'),
  description: z.string().min(1, 'Description is required'),
  priority: z.nativeEnum(TicketPriority),
  // A ticket cannot exist without a category.
  categoryId: z.string().min(1, 'Choose a category'),
  assigneeId: z.string().optional(),
});

type NewTicketFormData = z.infer<typeof newTicketSchema>;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function NewTicketPage() {
  const navigate = useNavigate();
  const createTicketMutation = useCreateTicket();

  // Side-effect state (not in Zod schema)
  const { tags: availableTags } = useTags();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const { uploadFiles, uploadProgress } = useUploadAttachment();

  // The form has no scope field: the backend places a new ticket in the
  // caller's selected context, so that is the scope whose people can take it.
  const selectedContext = useAtomValue(selectedContextAtom);
  const scopedAssignees = useScopedAssignees({
    tenantId: selectedContext?.tenantId,
    organisationId: selectedContext?.organisationId,
    divisionId: selectedContext?.divisionId,
  });
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const usersOptions = filterAssignees(scopedAssignees.options, assigneeQuery);

  // Autocomplete state via Jotai atoms (mirrors existing NewTicketForm pattern)
  const [
    {
      mutate: searchCategories,
      data: categoriesData,
      isPending: isSearchingCategories,
    },
  ] = useAtom(categoriesMutationAtom);

  useEffect(() => {
    searchCategories({ query: '' });
  }, [searchCategories]);

  const categoriesOptions = useMemo(
    () => (categoriesData ?? []).map(mapCategoryToOption),
    [categoriesData],
  );

  const form = useEntityForm<typeof newTicketSchema>({
    schema: newTicketSchema,
    defaultValues: {
      subject: '',
      description: '',
      priority: TicketPriority.Normal,
      categoryId: '',
      assigneeId: undefined,
    },
    onSubmit: async (values: NewTicketFormData) => {
      const result: any = await createTicketMutation.mutateAsync({
        subject: values.subject,
        description: values.description,
        priority: values.priority,
        categoryId: values.categoryId,
        assigneeId: values.assigneeId,
        tags: selectedTags,
      });

      // Upload attachments after ticket is created
      if (result?.id && pendingFiles.length > 0) {
        await uploadFiles(pendingFiles, result.id, undefined);
      }

      if (result?.id) {
        navigate(`/tickets/${result.id}`);
      } else {
        navigate('/tickets');
      }
    },
    invalidateQueryKeys: [['tickets']],
    toast: { success: 'Ticket created', error: 'Failed to create ticket' },
  });

  const handleFilesSelected = useCallback((files: File[]) => {
    setPendingFiles(prev => [...prev, ...files]);
  }, []);

  const handleRemoveFile = useCallback((fileName: string) => {
    setPendingFiles(prev => prev.filter(f => f.name !== fileName));
  }, []);

  const f = form.form;

  return (
    <FormPage
      title="Create New Ticket"
      breadcrumbsKey="tickets.new"
      form={form}
      onCancel={() => navigate('/tickets')}
    >
      <FormPage.Section title="Ticket Details" columns={1}>
        <f.Field name="subject">
          {field => (
            <BaseInput
              label="Subject"
              isRequired
              placeholder="Enter ticket subject"
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
            />
          )}
        </f.Field>

        <f.Field name="description">
          {field => (
            <BaseTextarea
              label="Description"
              isRequired
              placeholder="Describe the issue in detail"
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              minRows={6}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
              description="Use the textarea to describe the issue in detail"
            />
          )}
        </f.Field>
      </FormPage.Section>

      <FormPage.Section title="Classification" columns={2}>
        <f.Field name="priority">
          {field => (
            <BaseSelect
              label="Priority"
              isRequired
              selectedKey={field.state.value}
              onSelectionChange={key => {
                if (key) field.handleChange(String(key) as TicketPriority);
              }}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
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
                  mean, and both rendered as the same grey badge. The enum member
                  is kept so any historical or imported ticket still renders. */}
            </BaseSelect>
          )}
        </f.Field>

        <f.Field name="categoryId">
          {field => (
            <BaseAutocomplete
              label="Category"
              placeholder="Search category..."
              isRequired
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
              selectedKey={field.state.value || null}
              // Required, so there is nothing to clear it to.
              onSelectionChange={key => {
                if (key) field.handleChange(key as string);
              }}
              onValueChange={(value: string) => {
                searchCategories({ query: value });
              }}
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
          )}
        </f.Field>
      </FormPage.Section>

      <FormPage.Section title="Assignment">
        <f.Field name="assigneeId">
          {field => (
            <BaseAutocomplete
              label="Assignee"
              placeholder="Search assignee (optional)..."
              isClearable
              selectedKey={field.state.value ?? null}
              onSelectionChange={key => {
                field.handleChange((key as string | null) ?? undefined);
              }}
              onClear={() => field.handleChange(undefined)}
              onValueChange={setAssigneeQuery}
              onOpenChange={open => {
                if (!open) setAssigneeQuery('');
              }}
              isLoading={scopedAssignees.isLoading}
              renderSelectedItem={selectedKey => {
                const user = scopedAssignees.options.find(
                  u => u.id === selectedKey,
                );
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
          )}
        </f.Field>
      </FormPage.Section>

      <FormPage.Section title="Tags">
        {/* Tags are outside the Zod schema — managed separately as string[] */}
        <TagInput
          selectedTags={selectedTags}
          availableTags={availableTags}
          onTagsChange={setSelectedTags}
        />
      </FormPage.Section>

      <FormPage.Section title="Attachments">
        <div className="flex flex-col gap-4">
          <FileUploadZone
            onFilesSelected={handleFilesSelected}
            progress={uploadProgress}
          />
          {pendingFiles.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Pending uploads ({pendingFiles.length} files):
              </p>
              {pendingFiles.map(file => (
                <div
                  key={file.name}
                  className="flex items-center justify-between rounded border p-2"
                >
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
      </FormPage.Section>
    </FormPage>
  );
}

export default withAuthenticationRequired(NewTicketPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
