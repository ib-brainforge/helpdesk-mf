import type { CustomFieldDefinitionDto } from '@/types/custom-field';
import { CustomFieldType } from '@/types/custom-field';
import {
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  BaseTagSelect,
  BaseTagSelectItem,
  BaseTextarea,
} from '@brainforgeau/components';
import { Checkbox } from '@heroui/react';
import { useMemo } from 'react';

// REVIEW: Value type for custom field changes
export interface CustomFieldChangePayload {
  textValue?: string;
  numericValue?: number;
  dateValue?: string;
  booleanValue?: boolean;
  selectedOptionId?: string | null;
  selectedOptionIds?: string[];
}

// REVIEW: Custom field value structure (from backend)
export interface CustomFieldValueDto {
  id?: string;
  customFieldDefinitionId: string;
  stringValue?: string;
  numericValue?: number;
  dateValue?: string;
  booleanValue?: boolean;
  selectedOptionId?: string;
  selectedOptions?: Array<{ id: string; value: string }>;
}

interface CustomFieldRendererProps {
  field: CustomFieldDefinitionDto;
  value?: CustomFieldValueDto;
  onChange: (value: CustomFieldChangePayload) => void;
  readOnly?: boolean;
  error?: string;
}

/**
 * CustomFieldRenderer - Dynamic field renderer component
 *
 * Renders the appropriate input component based on the custom field type.
 * Used in ticket creation/edit forms to display custom fields dynamically.
 *
 * Supports field types:
 * - Text: Single-line text input
 * - MultilineText: Textarea
 * - Number: Numeric input
 * - Email: Email input with validation
 * - Url: URL input
 * - Date: Date picker
 * - Checkbox: Boolean checkbox
 * - Dropdown: Single-select dropdown
 * - MultiSelect: Multi-select dropdown
 */
export const CustomFieldRenderer: React.FC<CustomFieldRendererProps> = ({
  field,
  value,
  onChange,
  readOnly = false,
  error,
}) => {
  const fieldComponent = useMemo(() => {
    switch (field.fieldType) {
      case CustomFieldType.Text:
        return (
          <BaseInput
            value={value?.stringValue ?? ''}
            onValueChange={v => onChange({ textValue: v })}
            readOnly={readOnly}
            placeholder={`Enter ${field.name.toLowerCase()}`}
            isInvalid={!!error}
            errorMessage={error}
            isRequired={field.isRequired}
          />
        );

      case CustomFieldType.MultilineText:
        return (
          <BaseTextarea
            value={value?.stringValue ?? ''}
            onValueChange={v => onChange({ textValue: v })}
            readOnly={readOnly}
            minRows={4}
            placeholder={`Enter ${field.name.toLowerCase()}`}
            isInvalid={!!error}
            errorMessage={error}
            isRequired={field.isRequired}
            classNames={{
              input: 'resize-y',
            }}
          />
        );

      case CustomFieldType.Number:
        return (
          <BaseInput
            type="number"
            value={
              value?.numericValue !== undefined
                ? String(value.numericValue)
                : ''
            }
            onValueChange={v => {
              onChange({ numericValue: v ? Number(v) : undefined });
            }}
            readOnly={readOnly}
            placeholder="0"
            isInvalid={!!error}
            errorMessage={error}
            isRequired={field.isRequired}
          />
        );

      case CustomFieldType.Date:
        // REVIEW: Using native date input for simplicity
        // Can be replaced with @internationalized/date DatePicker if needed
        return (
          <BaseInput
            type="date"
            value={value?.dateValue ? value.dateValue.split('T')[0] : ''}
            onValueChange={v => {
              onChange({
                dateValue: v ? new Date(v).toISOString() : undefined,
              });
            }}
            readOnly={readOnly}
            isInvalid={!!error}
            errorMessage={error}
            isRequired={field.isRequired}
          />
        );

      case CustomFieldType.Checkbox:
        return (
          <Checkbox
            isSelected={value?.booleanValue ?? false}
            onChange={checked => onChange({ booleanValue: checked })}
            isDisabled={readOnly}
            isInvalid={!!error}
          >
            {field.name}
          </Checkbox>
        );

      case CustomFieldType.Dropdown:
        return (
          <BaseSelect
            label={field.name}
            placeholder="-- Select --"
            selectedKeys={
              value?.selectedOptionId ? [value.selectedOptionId] : []
            }
            onSelectionChange={keys => {
              const selectedKey = keys || null;
              onChange({ selectedOptionId: selectedKey });
            }}
            isDisabled={readOnly}
            isInvalid={!!error}
            errorMessage={error}
            isRequired={field.isRequired}
          >
            {(field.options || [])
              .filter(o => !o.isDisabled || o.id === value?.selectedOptionId)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map(option => (
                <BaseSelectItem key={option.id} value={option.id}>{option.value}</BaseSelectItem>
              ))}
          </BaseSelect>
        );

      case CustomFieldType.MultiSelect:
        return (
          <div className={readOnly ? 'pointer-events-none opacity-50' : ''}>
          <BaseTagSelect
            label={field.name}
            placeholder="Select options..."
            value={value?.selectedOptions?.map(o => o.id) ?? []}
            onValueChange={(selectedIds: string[]) => {
              onChange({ selectedOptionIds: selectedIds });
            }}
            isInvalid={!!error}
            errorMessage={error}
            isRequired={field.isRequired}
          >
            {(field.options || [])
              .filter(o => !o.isDisabled)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map(option => (
                <BaseTagSelectItem key={option.id} value={option.id}>{option.value}</BaseTagSelectItem>
              ))}
          </BaseTagSelect>
        </div>
        );

      case CustomFieldType.Url:
        if (readOnly && value?.stringValue) {
          return (
            <a
              href={value.stringValue}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue hover:underline"
            >
              {value.stringValue}
            </a>
          );
        }
        return (
          <BaseInput
            type="url"
            value={value?.stringValue ?? ''}
            onChange={e => onChange({ textValue: e.target.value })}
            readOnly={readOnly}
            placeholder="https://..."
            isInvalid={!!error}
            errorMessage={error}
            isRequired={field.isRequired}
          />
        );

      case CustomFieldType.Email:
        return (
          <BaseInput
            type="email"
            value={value?.stringValue ?? ''}
            onChange={e => onChange({ textValue: e.target.value })}
            readOnly={readOnly}
            placeholder="email@example.com"
            isInvalid={!!error}
            errorMessage={error}
            isRequired={field.isRequired}
          />
        );

      default:
        return <span className="text-default-500">Unsupported field type</span>;
    }
  }, [field, value, onChange, readOnly, error]);

  // REVIEW: Checkbox renders its own label, so we return it directly
  if (field.fieldType === CustomFieldType.Checkbox) {
    return (
      <div className="custom-field-renderer">
        {fieldComponent}
        {error && <span className="text-xs text-danger mt-1">{error}</span>}
      </div>
    );
  }

  // REVIEW: For Dropdown and MultiSelect, BaseSelect/BaseTagSelect includes label
  if (
    field.fieldType === CustomFieldType.Dropdown ||
    field.fieldType === CustomFieldType.MultiSelect
  ) {
    return <div className="custom-field-renderer">{fieldComponent}</div>;
  }

  // REVIEW: For other field types, wrap with label
  return (
    <div className="custom-field-renderer">
      <label className="block text-sm font-medium mb-1">
        {field.name}
        {field.isRequired && <span className="text-danger ml-1">*</span>}
      </label>
      {fieldComponent}
    </div>
  );
};
