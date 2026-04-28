import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  CustomFieldsApi,
} from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { CustomFieldUsageType } from '@/types/custom-field';
import type { CustomFieldDefinitionDto } from '@/types/custom-field';
import { toApiCustomFieldUsageType } from '@/utils/typeMappers';
import {
  CustomFieldRenderer,
  type CustomFieldChangePayload,
  type CustomFieldValueDto,
} from './CustomFieldRenderer';

interface CustomFieldsFormProps {
  categoryId: string;
  entityId?: string; // undefined for new entity
  entityType: CustomFieldUsageType;
  onChange: (values: Record<string, CustomFieldChangePayload>) => void;
  errors?: Record<string, string>;
}

/**
 * CustomFieldsForm - Renders all custom fields for a category
 *
 * This component is used within ticket creation/edit forms to display
 * all custom fields associated with the selected category.
 *
 * Features:
 * - Fetches custom field definitions for the category
 * - Fetches existing values for edit mode
 * - Provides onChange callback with all field values
 * - Displays validation errors per field
 */
export const CustomFieldsForm: React.FC<CustomFieldsFormProps> = ({
  categoryId,
  entityId,
  entityType,
  onChange,
  errors,
}) => {
  // REVIEW: Fetch custom field definitions for the category
  const { data: fieldDefinitions, isLoading: fieldsLoading } = useQuery<CustomFieldDefinitionDto[]>({
    queryKey: ['helpdesk-custom-fields-for-category', categoryId, entityType],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(CustomFieldsApi);
      // REVIEW: Convert local enum to API type using type mapper
      const apiUsageType = toApiCustomFieldUsageType(entityType);
      // REVIEW: Fetch fields filtered by usage type and category
      const response = await client.v1CustomFieldsGet(apiUsageType, false, categoryId);
      // Map generated types to local types
      return (response.data || []).map((field: any) => ({
        id: field.id!,
        name: field.name!,
        fieldType: field.fieldType ?? 0,
        usageType: field.usageType ?? 0,
        isRequired: field.isRequired ?? false,
        accessLevel: field.accessLevel ?? 0,
        isActive: field.isActive ?? true,
        options: field.options?.map((opt: any) => ({
          id: opt.id!,
          value: opt.value!,
          sortOrder: opt.sortOrder ?? 0,
          isDisabled: opt.isDisabled ?? false,
        })),
      }));
    },
    enabled: !!categoryId,
  });

  // REVIEW: Fetch existing custom field values for edit mode
  const { data: fieldValues, isLoading: valuesLoading } = useQuery<CustomFieldValueDto[]>({
    queryKey: ['helpdesk-custom-field-values', entityId, entityType],
    queryFn: async () => {
      if (!entityId) return [];
      // REVIEW: This endpoint needs to be implemented in the backend
      // For now, return empty array (values will be set during ticket creation)
      return [];
    },
    enabled: !!entityId,
  });

  const [localValues, setLocalValues] = useState<Record<string, CustomFieldChangePayload>>({});

  // REVIEW: Initialize local values from fetched data
  useEffect(() => {
    if (fieldValues && fieldValues.length > 0) {
      const initialValues: Record<string, CustomFieldChangePayload> = {};
      for (const fieldValue of fieldValues) {
        initialValues[fieldValue.customFieldDefinitionId] = {
          textValue: fieldValue.stringValue,
          numericValue: fieldValue.numericValue,
          dateValue: fieldValue.dateValue,
          booleanValue: fieldValue.booleanValue,
          selectedOptionId: fieldValue.selectedOptionId,
          selectedOptionIds: fieldValue.selectedOptions?.map((o) => o.id),
        };
      }
      setLocalValues(initialValues);
    }
  }, [fieldValues]);

  // REVIEW: Notify parent component when values change
  useEffect(() => {
    onChange(localValues);
  }, [localValues, onChange]);

  const handleFieldChange = (fieldId: string, payload: CustomFieldChangePayload) => {
    setLocalValues((prev) => ({
      ...prev,
      [fieldId]: payload,
    }));
  };

  if (fieldsLoading || valuesLoading) {
    return <div className="text-default-500 py-4">Loading custom fields...</div>;
  }

  if (!fieldDefinitions || fieldDefinitions.length === 0) {
    return null; // No custom fields for this category
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground mb-2">Custom Fields</h3>
      <div className="space-y-4">
        {fieldDefinitions.map((field: CustomFieldDefinitionDto) => {
          const existingValue = fieldValues?.find(
            (v) => v.customFieldDefinitionId === field.id
          );

          // REVIEW: Convert local payload back to CustomFieldValueDto for renderer
          const currentValue: CustomFieldValueDto | undefined = localValues[field.id]
            ? {
                customFieldDefinitionId: field.id,
                stringValue: localValues[field.id].textValue,
                numericValue: localValues[field.id].numericValue,
                dateValue: localValues[field.id].dateValue,
                booleanValue: localValues[field.id].booleanValue,
                selectedOptionId: localValues[field.id].selectedOptionId ?? undefined,
                selectedOptions: localValues[field.id].selectedOptionIds?.map((id: string) => ({
                  id,
                  value:
                    field.options?.find((o) => o.id === id)?.value || id,
                })),
              }
            : existingValue;

          return (
            <CustomFieldRenderer
              key={field.id}
              field={field}
              value={currentValue}
              onChange={(payload) => handleFieldChange(field.id, payload)}
              error={errors?.[field.id]}
            />
          );
        })}
      </div>
    </div>
  );
};
