import { BaseModal } from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { BaseInput, BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { addToast, Switch } from '@heroui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CategoriesApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CategoryDto, SectionDto, CreateCategoryCommand, UpdateCategoryCommand } from '@/types/category';
import { AccessLevel } from '@/types/category';

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sectionId: z.string().nullable().optional(),
  accessLevel: z.nativeEnum(AccessLevel),
  defaultAssigneeId: z.string().nullable().optional(),
  emailRoutingAddress: z.string().email().nullable().optional(),
  emailRoutingProtocol: z.string().nullable().optional(),
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

const EMAIL_PROTOCOL_OPTIONS = [
  { id: 'IMAP', name: 'IMAP' },
  { id: 'POP3', name: 'POP3' },
];

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
        const updateDto: UpdateCategoryCommand = {
          name: data.name,
          sectionId: data.sectionId || undefined,
          accessLevel: data.accessLevel,
          defaultAssigneeId: data.defaultAssigneeId || undefined,
          emailRoutingAddress: data.emailRoutingAddress || undefined,
          emailRoutingProtocol: data.emailRoutingProtocol || undefined,
          isActive: data.isActive,
          sortOrder: data.sortOrder,
          customFieldIds: data.customFieldIds,
        };
        await client.v1CategoriesIdPut(category.id, updateDto as any);
      } else {
        const createDto: CreateCategoryCommand = {
          name: data.name,
          sectionId: data.sectionId || undefined,
          accessLevel: data.accessLevel,
          defaultAssigneeId: data.defaultAssigneeId || undefined,
          emailRoutingAddress: data.emailRoutingAddress || undefined,
          emailRoutingProtocol: data.emailRoutingProtocol || undefined,
          isActive: data.isActive,
          sortOrder: data.sortOrder,
          customFieldIds: data.customFieldIds,
        };
        await client.v1CategoriesPost(createDto as any);
      }
    },
    onSuccess: () => {
      addToast({
        title: `Category ${isEdit ? 'updated' : 'created'} successfully`,
        severity: 'success',
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
      emailRoutingAddress: category?.emailRoutingAddress || null,
      emailRoutingProtocol: category?.emailRoutingProtocol || null,
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
    return errors.map(e => (typeof e === 'string' ? e : e.message || String(e))).join(', ');
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Edit Category' : 'Create Category'}
      size="2xl"
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

        <form.Field name="sectionId">
          {(field) => (
            <BaseSelect
              label="Section"
              placeholder="Select section (optional)"
              selectedKeys={field.state.value ? [field.state.value] : []}
              onSelectionChange={(keys) => {
                const newValue = keys.currentKey || null;
                field.handleChange(newValue);
              }}
            >
              {sections.map((section) => (
                <BaseSelectItem key={section.id}>{section.name}</BaseSelectItem>
              ))}
            </BaseSelect>
          )}
        </form.Field>

        <form.Field name="accessLevel">
          {(field) => (
            <BaseSelect
              label="Access Level"
              placeholder="Select access level"
              isRequired
              selectedKeys={[String(field.state.value)]}
              onSelectionChange={(keys) => {
                const newValue = Number(keys.currentKey) as AccessLevel;
                field.handleChange(newValue);
              }}
              errorMessage={formatFormErrors(field.state.meta.errors)}
              isInvalid={field.state.meta.errors.length > 0}
            >
              {ACCESS_LEVEL_OPTIONS.map((option) => (
                <BaseSelectItem key={String(option.id)}>{option.name}</BaseSelectItem>
              ))}
            </BaseSelect>
          )}
        </form.Field>

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="emailRoutingAddress">
            {(field) => (
              <BaseInput
                label="Email Routing Address"
                type="email"
                name={field.name}
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value || null)}
                placeholder="support@example.com"
                errorMessage={formatFormErrors(field.state.meta.errors)}
                isInvalid={field.state.meta.errors.length > 0}
              />
            )}
          </form.Field>

          <form.Field name="emailRoutingProtocol">
            {(field) => (
              <BaseSelect
                label="Email Protocol"
                placeholder="Select protocol"
                selectedKeys={field.state.value ? [field.state.value] : []}
                onSelectionChange={(keys) => {
                  const newValue = keys.currentKey || null;
                  field.handleChange(newValue);
                }}
              >
                {EMAIL_PROTOCOL_OPTIONS.map((protocol) => (
                  <BaseSelectItem key={protocol.id}>{protocol.name}</BaseSelectItem>
                ))}
              </BaseSelect>
            )}
          </form.Field>
        </div>

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
