import { BaseInput, BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import { Checkbox, Textarea } from '@heroui/react';
import { useMemo } from 'react';
import type { CustomFieldDefinitionDto } from '@/types/custom-field';
import { CustomFieldType } from '@/types/custom-field';

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
            onChange={(e) => onChange({ textValue: e.target.value })}
            isReadOnly={readOnly}
            placeholder={`Enter ${field.name.toLowerCase()}`}
            isInvalid={!!error}
            errorMessage={error}
            isRequired={field.isRequired}
          />
        );

      case CustomFieldType.MultilineText:
        return (
          <Textarea
            value={value?.stringValue ?? ''}
            onChange={(e) => onChange({ textValue: e.target.value })}
            isReadOnly={readOnly}
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
            value={value?.numericValue !== undefined ? String(value.numericValue) : ''}
            onChange={(e) => {
              const val = e.target.value;
              onChange({ numericValue: val ? Number(val) : undefined });
            }}
            isReadOnly={readOnly}
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
            onChange={(e) => {
              const dateStr = e.target.value;
              onChange({ dateValue: dateStr ? new Date(dateStr).toISOString() : undefined });
            }}
            isReadOnly={readOnly}
            isInvalid={!!error}
            errorMessage={error}
            isRequired={field.isRequired}
          />
        );

      case CustomFieldType.Checkbox:
        return (
          <Checkbox
            isSelected={value?.booleanValue ?? false}
            onValueChange={(checked) => onChange({ booleanValue: checked })}
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
            selectedKeys={value?.selectedOptionId ? [value.selectedOptionId] : []}
            onSelectionChange={(keys) => {
              const selectedKey = keys.currentKey || null;
              onChange({ selectedOptionId: selectedKey });
            }}
            isDisabled={readOnly}
            isInvalid={!!error}
            errorMessage={error}
            isRequired={field.isRequired}
          >
            {(field.options || [])
              .filter((o) => !o.isDisabled || o.id === value?.selectedOptionId)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((option) => (
                <BaseSelectItem key={option.id}>{option.value}</BaseSelectItem>
              ))}
          </BaseSelect>
        );

      case CustomFieldType.MultiSelect:
        return (
          <BaseSelect
            label={field.name}
            placeholder="Select options..."
            selectionMode="multiple"
            selectedKeys={value?.selectedOptions?.map((o) => o.id) ?? []}
            onSelectionChange={(keys) => {
              const selectedIds = Array.from(keys as Set<string>);
              onChange({ selectedOptionIds: selectedIds });
            }}
            isDisabled={readOnly}
            isInvalid={!!error}
            errorMessage={error}
            isRequired={field.isRequired}
          >
            {(field.options || [])
              .filter((o) => !o.isDisabled)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((option) => (
                <BaseSelectItem key={option.id}>{option.value}</BaseSelectItem>
              ))}
          </BaseSelect>
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
            onChange={(e) => onChange({ textValue: e.target.value })}
            isReadOnly={readOnly}
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
            onChange={(e) => onChange({ textValue: e.target.value })}
            isReadOnly={readOnly}
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

  // REVIEW: For Dropdown and MultiSelect, BaseSelect includes label
  if (field.fieldType === CustomFieldType.Dropdown || field.fieldType === CustomFieldType.MultiSelect) {
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
