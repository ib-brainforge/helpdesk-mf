import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CategoryDto, SectionDto } from '@/types/category';
import { AccessLevel } from '@/types/category';
import {
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalHeader,
} from '@brainforgeau/components';
import {
  BaseInput,
  BaseSelect,
  BaseSelectItem,
} from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { CategoriesApi } from '@brainforgeau/helpdesk-client';
import type {
  HelpdeskApplicationCategoriesCommandsCreateCategoryCreateCategoryCommand,
  HelpdeskApplicationCategoriesCommandsUpdateCategoryUpdateCategoryCommand,
  HelpdeskDomainCategoriesEnumsAccessLevel,
} from '@brainforgeau/helpdesk-client';
import { Switch, toast } from '@heroui/react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sectionId: z.string().nullable().optional(),
  accessLevel: z.nativeEnum(AccessLevel),
  defaultAssigneeId: z.string().nullable().optional(),
  fromEmailAddress: z.string().email().nullable().optional(),
  fromEmailName: z.string().nullable().optional(),
  useFromAddressAsReplyTo: z.boolean().optional(),
  isActive: z.boolean(),
  sortOrder: z.number().min(0),
  customFieldIds: z.array(z.string()).optional(),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

interface CategoryEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: CategoryDto;
  sections: SectionDto[];
}

const ACCESS_LEVEL_OPTIONS = [
  { id: AccessLevel.Everyone, name: 'Everyone' },
  { id: AccessLevel.AgentsOnly, name: 'Agents Only' },
  { id: AccessLevel.AdminsOnly, name: 'Admins Only' },
];

// Map local numeric AccessLevel enum to the generated string enum expected by the API.
const ACCESS_LEVEL_TO_API: Record<
  AccessLevel,
  HelpdeskDomainCategoriesEnumsAccessLevel
> = {
  [AccessLevel.Everyone]: 'Everyone',
  [AccessLevel.AgentsOnly]: 'AgentsOnly',
  [AccessLevel.AdminsOnly]: 'AdminsOnly',
};

export const CategoryEditorModal: React.FC<CategoryEditorModalProps> = ({
  isOpen,
  onClose,
  category,
  sections,
}) => {
  const queryClient = useQueryClient();
  const isEdit = Boolean(category);

  const mutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const client = await createHelpdeskApiClient(CategoriesApi);

      if (isEdit && category) {
        const updateDto: HelpdeskApplicationCategoriesCommandsUpdateCategoryUpdateCategoryCommand =
          {
            name: data.name,
            sectionId: data.sectionId || null,
            accessLevel: ACCESS_LEVEL_TO_API[data.accessLevel],
            fromEmailAddress: data.fromEmailAddress || null,
            fromEmailName: data.fromEmailName || null,
            useFromAddressAsReplyTo: data.useFromAddressAsReplyTo ?? false,
            sortOrder: data.sortOrder,
            customFieldIds: data.customFieldIds ?? null,
          };
        await client.v1CategoriesIdPut(category.id, updateDto);
      } else {
        const createDto: HelpdeskApplicationCategoriesCommandsCreateCategoryCreateCategoryCommand =
          {
            name: data.name,
            sectionId: data.sectionId || null,
            accessLevel: ACCESS_LEVEL_TO_API[data.accessLevel],
            fromEmailAddress: data.fromEmailAddress || null,
            fromEmailName: data.fromEmailName || null,
            useFromAddressAsReplyTo: data.useFromAddressAsReplyTo ?? false,
            sortOrder: data.sortOrder,
            customFieldIds: data.customFieldIds ?? null,
          };
        await client.v1CategoriesPost(createDto);
      }
    },
    onSuccess: () => {
      toast(`Category ${isEdit ? 'updated' : 'created'} successfully`, {
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['helpdesk-categories'] });
      onClose();
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });

  const form = useForm({
    defaultValues: {
      name: category?.name || '',
      sectionId: category?.sectionId || null,
      accessLevel: category?.accessLevel ?? AccessLevel.Everyone,
      defaultAssigneeId: category?.defaultAssigneeId || null,
      fromEmailAddress: category?.fromEmailAddress || null,
      fromEmailName: category?.fromEmailName || null,
      useFromAddressAsReplyTo: category?.useFromAddressAsReplyTo ?? false,
      isActive: category?.isActive ?? true,
      sortOrder: category?.sortOrder ?? 0,
      customFieldIds: category?.customFieldIds || [],
    } as CategoryFormData,
    validators: {
      onChange: categoryFormSchema,
      onSubmit: categoryFormSchema,
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
    <BaseModal isOpen={isOpen} onClose={handleClose} size="2xl">
      <BaseModalContent>
        <BaseModalHeader
          title={isEdit ? 'Edit Category' : 'Create Category'}
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

            <form.Field name="sectionId">
              {field => (
                <BaseSelect
                  label="Section"
                  placeholder="Select section (optional)"
                  selectedKey={field.state.value ? field.state.value : null}
                  onSelectionChange={keys => {
                    const newValue = keys || null;
                    field.handleChange(newValue);
                  }}
                >
                  {sections.map(section => (
                    <BaseSelectItem key={section.id} value={section.id}>
                      {section.name}
                    </BaseSelectItem>
                  ))}
                </BaseSelect>
              )}
            </form.Field>

            <form.Field name="accessLevel">
              {field => (
                <BaseSelect
                  label="Access Level"
                  placeholder="Select access level"
                  isRequired
                  selectedKey={String(field.state.value)}
                  onSelectionChange={keys => {
                    const newValue = Number(keys) as AccessLevel;
                    field.handleChange(newValue);
                  }}
                  errorMessage={formatFormErrors(field.state.meta.errors)}
                  isInvalid={field.state.meta.errors.length > 0}
                >
                  {ACCESS_LEVEL_OPTIONS.map(option => (
                    <BaseSelectItem key={String(option.id)} value={String(option.id)}>
                      {option.name}
                    </BaseSelectItem>
                  ))}
                </BaseSelect>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="fromEmailAddress">
                {field => (
                  <BaseInput
                    label="From Email Address"
                    type="email"
                    name={field.name}
                    value={field.state.value ?? ''}
                    onChange={e => field.handleChange(e.target.value || null)}
                    placeholder="support@example.com"
                    errorMessage={formatFormErrors(field.state.meta.errors)}
                    isInvalid={field.state.meta.errors.length > 0}
                  />
                )}
              </form.Field>

              <form.Field name="fromEmailName">
                {field => (
                  <BaseInput
                    label="From Name"
                    name={field.name}
                    value={field.state.value ?? ''}
                    onChange={e => field.handleChange(e.target.value || null)}
                    placeholder="Support Team"
                    errorMessage={formatFormErrors(field.state.meta.errors)}
                    isInvalid={field.state.meta.errors.length > 0}
                  />
                )}
              </form.Field>
            </div>

            <form.Field name="useFromAddressAsReplyTo">
              {field => (
                <Switch
                  isSelected={field.state.value ?? false}
                  onChange={checked => field.handleChange(checked)}
                >
                  Use from address as reply-to
                </Switch>
              )}
            </form.Field>

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
                <Switch
                  isSelected={field.state.value}
                  onChange={checked => field.handleChange(checked)}
                >
                  Active
                </Switch>
              )}
            </form.Field>

            <div className="flex justify-end gap-2 mt-4">
              <BaseButton
                variant="bordered"
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
