import { BaseModal } from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { BaseInput, BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { addToast, Switch } from '@heroui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CustomFieldsApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type {
  CustomFieldDefinitionDto,
  CreateCustomFieldCommand,
  UpdateCustomFieldCommand,
  CustomFieldOptionDto,
} from '@/types/custom-field';
import { CustomFieldType, CustomFieldUsageType } from '@/types/custom-field';
import { AccessLevel } from '@/types/category';

const customFieldFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  fieldType: z.nativeEnum(CustomFieldType),
  usageType: z.nativeEnum(CustomFieldUsageType),
  isRequired: z.boolean(),
  accessLevel: z.nativeEnum(AccessLevel),
  isActive: z.boolean(),
});

type CustomFieldFormData = z.infer<typeof customFieldFormSchema>;

interface CustomFieldEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  field?: CustomFieldDefinitionDto;
}

const FIELD_TYPE_OPTIONS = [
  { id: CustomFieldType.Text, name: 'Text' },
  { id: CustomFieldType.MultilineText, name: 'Multiline Text' },
  { id: CustomFieldType.Number, name: 'Number' },
  { id: CustomFieldType.Email, name: 'Email' },
  { id: CustomFieldType.Url, name: 'URL' },
  { id: CustomFieldType.Date, name: 'Date' },
  { id: CustomFieldType.Checkbox, name: 'Checkbox' },
  { id: CustomFieldType.Dropdown, name: 'Dropdown' },
  { id: CustomFieldType.MultiSelect, name: 'Multi-Select' },
];

const USAGE_TYPE_OPTIONS = [
  { id: CustomFieldUsageType.Ticket, name: 'Ticket' },
];

const ACCESS_LEVEL_OPTIONS = [
  { id: AccessLevel.Everyone, name: 'Everyone' },
  { id: AccessLevel.AgentsOnly, name: 'Agents Only' },
  { id: AccessLevel.AdminsOnly, name: 'Admins Only' },
];

export const CustomFieldEditorModal: React.FC<CustomFieldEditorModalProps> = ({
  isOpen,
  onClose,
  field,
}) => {
  const queryClient = useQueryClient();
  const isEdit = Boolean(field);

  // State for managing options (for Dropdown/MultiSelect fields)
  const [options, setOptions] = useState<CustomFieldOptionDto[]>(field?.options || []);
  const [newOptionValue, setNewOptionValue] = useState('');

  const mutation = useMutation({
    mutationFn: async (data: CustomFieldFormData) => {
      const client = await createHelpdeskApiClient(CustomFieldsApi);

      if (isEdit && field) {
        const updateDto: UpdateCustomFieldCommand = {
          ...data,
          options: options.length > 0 ? options : undefined,
        };
        await client.v1CustomFieldsIdPut(field.id, updateDto as any);
      } else {
        const createDto: CreateCustomFieldCommand = {
          ...data,
          options: options.length > 0 ? options.map(o => ({ value: o.value, sortOrder: o.sortOrder })) : undefined,
        };
        await client.v1CustomFieldsPost(createDto as any);
      }
    },
    onSuccess: () => {
      addToast({
        title: `Custom field ${isEdit ? 'updated' : 'created'} successfully`,
        severity: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['helpdesk-custom-fields'] });
      onClose();
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });

  const form = useForm({
    defaultValues: {
      name: field?.name || '',
      fieldType: field?.fieldType ?? CustomFieldType.Text,
      usageType: field?.usageType ?? CustomFieldUsageType.Ticket,
      isRequired: field?.isRequired ?? false,
      accessLevel: field?.accessLevel ?? AccessLevel.Everyone,
      isActive: field?.isActive ?? true,
    } as CustomFieldFormData,
    validators: {
      onChange: customFieldFormSchema,
      onSubmit: customFieldFormSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  const formatFormErrors = (errors: any[]): string | undefined => {
    if (!errors || errors.length === 0) return undefined;
    return errors.map(e => (typeof e === 'string' ? e : e.message || String(e))).join(', ');
  };

  const [selectedFieldType, setSelectedFieldType] = useState(field?.fieldType ?? CustomFieldType.Text);
  const needsOptions = selectedFieldType === CustomFieldType.Dropdown || selectedFieldType === CustomFieldType.MultiSelect;

  const handleAddOption = () => {
    if (newOptionValue.trim()) {
      const newOption: CustomFieldOptionDto = {
        id: `temp-${Date.now()}`,
        value: newOptionValue.trim(),
        sortOrder: options.length,
      };
      setOptions([...options, newOption]);
      setNewOptionValue('');
    }
  };

  const handleRemoveOption = (optionId: string) => {
    setOptions(options.filter(o => o.id !== optionId));
  };

  const handleMoveOption = (index: number, direction: 'up' | 'down') => {
    const newOptions = [...options];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOptions.length) return;

    [newOptions[index], newOptions[targetIndex]] = [newOptions[targetIndex], newOptions[index]];
    newOptions.forEach((opt, idx) => { opt.sortOrder = idx; });
    setOptions(newOptions);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Custom Field' : 'Create Custom Field'}
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

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="fieldType">
            {(field) => (
              <BaseSelect
                label="Field Type"
                placeholder="Select type"
                isRequired
                selectedKeys={[String(field.state.value)]}
                onSelectionChange={(keys) => {
                  const newValue = Number(keys.currentKey) as CustomFieldType;
                  field.handleChange(newValue);
                  setSelectedFieldType(newValue);
                }}
                errorMessage={formatFormErrors(field.state.meta.errors)}
                isInvalid={field.state.meta.errors.length > 0}
              >
                {FIELD_TYPE_OPTIONS.map((option) => (
                  <BaseSelectItem key={String(option.id)}>{option.name}</BaseSelectItem>
                ))}
              </BaseSelect>
            )}
          </form.Field>

          <form.Field name="usageType">
            {(field) => (
              <BaseSelect
                label="Usage Type"
                placeholder="Select usage"
                isRequired
                selectedKeys={[String(field.state.value)]}
                onSelectionChange={(keys) => {
                  const newValue = Number(keys.currentKey) as CustomFieldUsageType;
                  field.handleChange(newValue);
                }}
                errorMessage={formatFormErrors(field.state.meta.errors)}
                isInvalid={field.state.meta.errors.length > 0}
              >
                {USAGE_TYPE_OPTIONS.map((option) => (
                  <BaseSelectItem key={String(option.id)}>{option.name}</BaseSelectItem>
                ))}
              </BaseSelect>
            )}
          </form.Field>
        </div>

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

        <div className="flex gap-4">
          <form.Field name="isRequired">
            {(field) => (
              <Switch
                isSelected={field.state.value}
                onValueChange={(checked) => field.handleChange(checked)}
              >
                Required
              </Switch>
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
        </div>

        {needsOptions && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Options</h3>
            <div className="flex gap-2 mb-3">
              <BaseInput
                placeholder="Add option..."
                value={newOptionValue}
                onChange={(e) => setNewOptionValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddOption();
                  }
                }}
              />
              <BaseButton
                type="button"
                onPress={handleAddOption}
                icon={<Icon name="plus" className="h-4 w-4" />}
              >
                Add
              </BaseButton>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2 p-2 bg-content1 rounded border">
                  <div className="flex flex-col gap-1">
                    <BaseButton
                      type="button"
                      variant="link"
                      size="none"
                      isDisabled={index === 0}
                      onPress={() => handleMoveOption(index, 'up')}
                      icon={<Icon name="chevron-up" className="h-3 w-3" />}
                    />
                    <BaseButton
                      type="button"
                      variant="link"
                      size="none"
                      isDisabled={index === options.length - 1}
                      onPress={() => handleMoveOption(index, 'down')}
                      icon={<Icon name="chevron-down" className="h-3 w-3" />}
                    />
                  </div>
                  <span className="flex-1 text-sm">{option.value}</span>
                  <BaseButton
                    type="button"
                    variant="link"
                    size="none"
                    className="text-danger"
                    onPress={() => handleRemoveOption(option.id)}
                    icon={<Icon name="trash" className="h-4 w-4" />}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <BaseButton variant="bordered" onPress={onClose} type="button">
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
