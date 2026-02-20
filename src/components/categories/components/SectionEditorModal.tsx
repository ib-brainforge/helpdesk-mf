import { BaseModal } from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { BaseInput } from '@brainforgeau/components';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { addToast, Switch } from '@heroui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CategoriesApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { SectionDto, CreateSectionCommand, UpdateSectionCommand } from '@/types/category';

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

  const mutation = useMutation({
    mutationFn: async (data: SectionFormData) => {
      const client = await createHelpdeskApiClient(CategoriesApi);

      if (isEdit && section) {
        const updateDto: UpdateSectionCommand = { ...data };
        await client.v1CategoriesSectionsIdPut(section.id, updateDto as any);
      } else {
        const createDto: CreateSectionCommand = { ...data };
        await client.v1CategoriesSectionsPost(createDto as any);
      }
    },
    onSuccess: () => {
      addToast({
        title: `Section ${isEdit ? 'updated' : 'created'} successfully`,
        severity: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['helpdesk-sections'] });
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
    return errors.map(e => (typeof e === 'string' ? e : e.message || String(e))).join(', ');
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Edit Section' : 'Create Section'}
      size="md"
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await form.handleSubmit();
        }}
        className="flex flex-col gap-4"
      >
        <form.Field name="name">
          {(field) => (
            <BaseInput
              label="Name"
              isRequired
              name={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              errorMessage={formatFormErrors(field.state.meta.errors)}
              isInvalid={field.state.meta.errors.length > 0}
            />
          )}
        </form.Field>

        <form.Field name="sortOrder">
          {(field) => (
            <BaseInput
              label="Sort Order"
              type="number"
              name={field.name}
              value={String(field.state.value)}
              onChange={(e) => field.handleChange(Number(e.target.value))}
              errorMessage={formatFormErrors(field.state.meta.errors)}
              isInvalid={field.state.meta.errors.length > 0}
            />
          )}
        </form.Field>

        <form.Field name="isActive">
          {(field) => (
            <Switch
              isSelected={field.state.value}
              onValueChange={(checked) => field.handleChange(checked)}
            >
              Active
            </Switch>
          )}
        </form.Field>

        <div className="flex justify-end gap-2 mt-4">
          <BaseButton variant="bordered" onPress={handleClose} type="button">
            Cancel
          </BaseButton>
          <BaseButton type="submit" isLoading={mutation.isPending}>
            {isEdit ? 'Update' : 'Create'}
          </BaseButton>
        </div>
      </form>
    </BaseModal>
  );
};
