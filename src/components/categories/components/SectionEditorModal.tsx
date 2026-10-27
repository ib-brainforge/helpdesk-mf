import { CategoriesApi, ScopeApi } from '@/api/helpdesk-client';
import { ModalHeader } from '@/components/shared';
import { useEntityScopeStrip } from '@/hooks/useEntityScopeStrip';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type {
  CreateSectionCommand,
  SectionDto,
  UpdateSectionCommand,
} from '@/types/category';
import {
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseToggle,
  RecordStrip,
} from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { toast } from '@heroui/react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const sectionFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sortOrder: z.number().min(0),
  isActive: z.boolean(),
});

type SectionFormData = z.infer<typeof sectionFormSchema>;

interface SectionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  section?: SectionDto;
}

export const SectionEditorModal: React.FC<SectionEditorModalProps> = ({
  isOpen,
  onClose,
  section,
}) => {
  const queryClient = useQueryClient();
  const isEdit = Boolean(section);

  // DTO tenancy/scope metadata initiative -- only meaningful once the
  // section exists (has an id/meta); the create form has nothing to place
  // yet (gated on `isEdit` below).
  const { stripProps: scopeStripProps } = useEntityScopeStrip({
    mode: 'modal',
    entityLabel: 'Section',
    meta: section?.meta,
    patchScope: async patch => {
      if (!section) return;
      const client = await createHelpdeskApiClient(ScopeApi);
      // entityType verified against helpdesk-backend's `HelpdeskDbContext`
      // (`DbSet<Section> Sections` -- `Domain.Categories.Aggregates.Section`,
      // also the CLR type name `HelpdeskResourceGroupMapping` keys on).
      await client.v1ScopeEntityTypeIdPatch('Section', section.id, patch);
    },
    onSaved: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-sections'] });
      // A section move also affects the categories query's embedded
      // sectionName join -- invalidate both, matching the mutation's own
      // onSuccess below.
      queryClient.invalidateQueries({ queryKey: ['helpdesk-categories'] });
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: SectionFormData) => {
      const client = await createHelpdeskApiClient(CategoriesApi);

      if (isEdit && section) {
        const updateDto: UpdateSectionCommand = { ...data };
        await client.v1CategoriesSectionsIdPut(section.id, updateDto);
      } else {
        const createDto: CreateSectionCommand = { ...data };
        await client.v1CategoriesSectionsPost(createDto);
      }
    },
    onSuccess: () => {
      toast(`Section ${isEdit ? 'updated' : 'created'} successfully`, {
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['helpdesk-sections'] });
      // Invalidate categories too: the hierarchy response embeds sectionName on each category.
      // A section rename would leave stale sectionName values in the categories query cache.
      queryClient.invalidateQueries({ queryKey: ['helpdesk-categories'] });
      onClose();
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });

  const form = useForm({
    defaultValues: {
      name: section?.name || '',
      sortOrder: section?.sortOrder ?? 0,
      isActive: section?.isActive ?? true,
    } as SectionFormData,
    validators: {
      onChange: sectionFormSchema,
      onSubmit: sectionFormSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const formatFormErrors = (errors: any[]): string | undefined => {
    if (!errors || errors.length === 0) return undefined;
    return errors
      .map(e => (typeof e === 'string' ? e : e.message || String(e)))
      .join(', ');
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} size="md">
      <BaseModalContent>
        <ModalHeader
          title={isEdit ? 'Edit Section' : 'Create Section'}
          onClose={handleClose}
        />
        <BaseModalBody>
          <form
            onSubmit={async e => {
              e.preventDefault();
              e.stopPropagation();
              await form.handleSubmit();
            }}
            className="flex flex-col gap-4 pb-4"
          >
            <form.Field name="name">
              {field => (
                <BaseInput
                  label="Name"
                  isRequired
                  name={field.name}
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                  errorMessage={formatFormErrors(field.state.meta.errors)}
                  isInvalid={field.state.meta.errors.length > 0}
                />
              )}
            </form.Field>

            {/* Scope strip (DTO tenancy/scope metadata initiative) -- only
                meaningful once the record exists (has an id/meta); the create
                form has nothing to place yet. */}
            {isEdit && <RecordStrip {...scopeStripProps} />}

            <form.Field name="sortOrder">
              {field => (
                <BaseInput
                  label="Sort Order"
                  type="number"
                  name={field.name}
                  value={String(field.state.value)}
                  onChange={e => field.handleChange(Number(e.target.value))}
                  errorMessage={formatFormErrors(field.state.meta.errors)}
                  isInvalid={field.state.meta.errors.length > 0}
                />
              )}
            </form.Field>

            <form.Field name="isActive">
              {field => (
                <BaseToggle
                  isSelected={field.state.value}
                  onChange={checked => field.handleChange(checked)}
                >
                  Active
                </BaseToggle>
              )}
            </form.Field>

            <div className="flex justify-end gap-2 mt-4">
              <BaseButton
                variant="bordered"
                color="light"
                onPress={handleClose}
                type="button"
              >
                Cancel
              </BaseButton>
              <BaseButton type="submit" isDisabled={mutation.isPending}>
                {isEdit ? 'Update' : 'Create'}
              </BaseButton>
            </div>
          </form>
        </BaseModalBody>
      </BaseModalContent>
    </BaseModal>
  );
};
