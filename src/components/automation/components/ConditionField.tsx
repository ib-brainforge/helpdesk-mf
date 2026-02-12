import { BaseInput, BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import { ConditionType } from '@/types/automation';
import { TicketStatus, TicketPriority } from '@/types/ticket';

interface ConditionFieldProps {
  type: ConditionType;
  parameters: Record<string, any>;
  onParametersChange: (parameters: Record<string, any>) => void;
}

// REVIEW: Using simple input fields for now - can be enhanced with specific selectors
export const ConditionField = ({ type, parameters, onParametersChange }: ConditionFieldProps) => {
  const updateParameter = (key: string, value: any) => {
    onParametersChange({ ...parameters, [key]: value });
  };

  // Map condition types to their required parameter fields
  switch (type) {
    case ConditionType.StatusIs:
    case ConditionType.StatusIsNot:
      return (
        <BaseSelect
          label="Status"
          placeholder="Select status"
          selectedKeys={parameters.status ? [String(parameters.status)] : []}
          onSelectionChange={(keys) => updateParameter('status', Number(keys.currentKey))}
        >
          <BaseSelectItem key={String(TicketStatus.New)}>New</BaseSelectItem>
          <BaseSelectItem key={String(TicketStatus.InProgress)}>In Progress</BaseSelectItem>
          <BaseSelectItem key={String(TicketStatus.Closed)}>Closed</BaseSelectItem>
        </BaseSelect>
      );

    case ConditionType.PriorityIs:
    case ConditionType.PriorityIsNot:
      return (
        <BaseSelect
          label="Priority"
          placeholder="Select priority"
          selectedKeys={parameters.priority ? [String(parameters.priority)] : []}
          onSelectionChange={(keys) => updateParameter('priority', Number(keys.currentKey))}
        >
          <BaseSelectItem key={String(TicketPriority.Low)}>Low</BaseSelectItem>
          <BaseSelectItem key={String(TicketPriority.Normal)}>Normal</BaseSelectItem>
          <BaseSelectItem key={String(TicketPriority.High)}>High</BaseSelectItem>
          <BaseSelectItem key={String(TicketPriority.Critical)}>Critical</BaseSelectItem>
        </BaseSelect>
      );

    case ConditionType.CategoryIs:
    case ConditionType.CategoryIsNot:
      return (
        <BaseInput
          label="Category ID"
          placeholder="Enter category ID"
          value={parameters.categoryId ?? ''}
          onChange={(e) => updateParameter('categoryId', e.target.value)}
        />
      );

    case ConditionType.AssigneeIs:
    case ConditionType.AssigneeIsNot:
    case ConditionType.RequesterIs:
    case ConditionType.RequesterIsNot:
      return (
        <BaseInput
          label="User ID"
          placeholder="Enter user ID"
          value={parameters.userId ?? ''}
          onChange={(e) => updateParameter('userId', e.target.value)}
        />
      );

    case ConditionType.SubjectContains:
    case ConditionType.SubjectNotContains:
    case ConditionType.DescriptionContains:
    case ConditionType.DescriptionNotContains:
      return (
        <BaseInput
          label="Text"
          placeholder="Enter text to match"
          value={parameters.text ?? ''}
          onChange={(e) => updateParameter('text', e.target.value)}
        />
      );

    case ConditionType.TagsContain:
    case ConditionType.TagsNotContain:
      return (
        <BaseInput
          label="Tag"
          placeholder="Enter tag name"
          value={parameters.tag ?? ''}
          onChange={(e) => updateParameter('tag', e.target.value)}
        />
      );

    case ConditionType.CreatedBefore:
    case ConditionType.CreatedAfter:
    case ConditionType.UpdatedBefore:
    case ConditionType.UpdatedAfter:
    case ConditionType.DueDateBefore:
    case ConditionType.DueDateAfter:
      return (
        <BaseInput
          label="Date"
          type="datetime-local"
          value={parameters.date ?? ''}
          onChange={(e) => updateParameter('date', e.target.value)}
        />
      );

    case ConditionType.CustomFieldEquals:
    case ConditionType.CustomFieldNotEquals:
    case ConditionType.CustomFieldContains:
    case ConditionType.CustomFieldNotContains:
      return (
        <div className="grid grid-cols-2 gap-2">
          <BaseInput
            label="Field ID"
            placeholder="Custom field ID"
            value={parameters.fieldId ?? ''}
            onChange={(e) => updateParameter('fieldId', e.target.value)}
          />
          <BaseInput
            label="Value"
            placeholder="Field value"
            value={parameters.value ?? ''}
            onChange={(e) => updateParameter('value', e.target.value)}
          />
        </div>
      );

    case ConditionType.HasAttachments:
      return (
        <BaseSelect
          label="Has Attachments"
          selectedKeys={parameters.hasAttachments ? ['true'] : ['false']}
          onSelectionChange={(keys) => updateParameter('hasAttachments', keys.currentKey === 'true')}
        >
          <BaseSelectItem key="true">Yes</BaseSelectItem>
          <BaseSelectItem key="false">No</BaseSelectItem>
        </BaseSelect>
      );

    default:
      return (
        <div className="text-sm text-gray-500">
          No additional parameters required
        </div>
      );
  }
};
