import { BaseInput, BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import { Textarea } from '@heroui/react';
import { ActionType } from '@/types/automation';
import { TicketStatus, TicketPriority } from '@/types/ticket';

interface ActionFieldProps {
  type: ActionType;
  parameters: Record<string, any>;
  onParametersChange: (parameters: Record<string, any>) => void;
}

// REVIEW: Using simple input fields for now - can be enhanced with specific selectors
export const ActionField = ({ type, parameters, onParametersChange }: ActionFieldProps) => {
  const updateParameter = (key: string, value: any) => {
    onParametersChange({ ...parameters, [key]: value });
  };

  // Map action types to their required parameter fields
  switch (type) {
    case ActionType.SetStatus:
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

    case ActionType.SetPriority:
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

    case ActionType.SetCategory:
      return (
        <BaseInput
          label="Category ID"
          placeholder="Enter category ID"
          value={parameters.categoryId ?? ''}
          onChange={(e) => updateParameter('categoryId', e.target.value)}
        />
      );

    case ActionType.AssignToAgent:
    case ActionType.AddSubscriber:
    case ActionType.RemoveSubscriber:
      return (
        <BaseInput
          label="User ID"
          placeholder="Enter user ID"
          value={parameters.userId ?? ''}
          onChange={(e) => updateParameter('userId', e.target.value)}
        />
      );

    case ActionType.AssignToGroup:
      return (
        <BaseInput
          label="Group ID"
          placeholder="Enter group ID"
          value={parameters.groupId ?? ''}
          onChange={(e) => updateParameter('groupId', e.target.value)}
        />
      );

    case ActionType.AddTag:
    case ActionType.RemoveTag:
      return (
        <BaseInput
          label="Tag"
          placeholder="Enter tag name"
          value={parameters.tag ?? ''}
          onChange={(e) => updateParameter('tag', e.target.value)}
        />
      );

    case ActionType.SendEmail:
      return (
        <div className="flex flex-col gap-2">
          <BaseInput
            label="To Email"
            placeholder="recipient@example.com"
            value={parameters.toEmail ?? ''}
            onChange={(e) => updateParameter('toEmail', e.target.value)}
          />
          <BaseInput
            label="Subject"
            placeholder="Email subject"
            value={parameters.subject ?? ''}
            onChange={(e) => updateParameter('subject', e.target.value)}
          />
          <Textarea
            label="Body"
            placeholder="Email body (supports variables)"
            value={parameters.body ?? ''}
            onValueChange={(value) => updateParameter('body', value)}
            minRows={3}
          />
        </div>
      );

    case ActionType.SendWebhook:
      return (
        <div className="flex flex-col gap-2">
          <BaseInput
            label="Webhook URL"
            placeholder="https://example.com/webhook"
            value={parameters.url ?? ''}
            onChange={(e) => updateParameter('url', e.target.value)}
          />
          <BaseSelect
            label="HTTP Method"
            selectedKeys={parameters.method ? [parameters.method] : ['POST']}
            onSelectionChange={(keys) => updateParameter('method', keys.currentKey)}
          >
            <BaseSelectItem key="GET">GET</BaseSelectItem>
            <BaseSelectItem key="POST">POST</BaseSelectItem>
            <BaseSelectItem key="PUT">PUT</BaseSelectItem>
            <BaseSelectItem key="PATCH">PATCH</BaseSelectItem>
          </BaseSelect>
        </div>
      );

    case ActionType.AddComment:
    case ActionType.AddInternalNote:
      return (
        <Textarea
          label="Comment"
          placeholder="Enter comment text (supports variables)"
          value={parameters.body ?? ''}
          onValueChange={(value) => updateParameter('body', value)}
          minRows={3}
        />
      );

    case ActionType.SetCustomField:
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

    case ActionType.SetDueDate:
      return (
        <BaseInput
          label="Due Date"
          type="datetime-local"
          value={parameters.dueDate ?? ''}
          onChange={(e) => updateParameter('dueDate', e.target.value)}
        />
      );

    case ActionType.MergeTicket:
    case ActionType.SplitTicket:
      return (
        <BaseInput
          label="Target Ticket ID"
          placeholder="Enter ticket ID"
          value={parameters.targetTicketId ?? ''}
          onChange={(e) => updateParameter('targetTicketId', e.target.value)}
        />
      );

    case ActionType.SendSms:
      return (
        <div className="flex flex-col gap-2">
          <BaseInput
            label="Phone Number"
            placeholder="+1234567890"
            value={parameters.phoneNumber ?? ''}
            onChange={(e) => updateParameter('phoneNumber', e.target.value)}
          />
          <Textarea
            label="Message"
            placeholder="SMS message (supports variables)"
            value={parameters.message ?? ''}
            onValueChange={(value) => updateParameter('message', value)}
            minRows={2}
          />
        </div>
      );

    case ActionType.CreateTask:
      return (
        <div className="flex flex-col gap-2">
          <BaseInput
            label="Task Title"
            placeholder="Enter task title"
            value={parameters.title ?? ''}
            onChange={(e) => updateParameter('title', e.target.value)}
          />
          <Textarea
            label="Task Description"
            placeholder="Enter task description"
            value={parameters.description ?? ''}
            onValueChange={(value) => updateParameter('description', value)}
            minRows={2}
          />
        </div>
      );

    case ActionType.AssignToMe:
    case ActionType.CloseTicket:
    case ActionType.ReopenTicket:
    case ActionType.NotifyAssignee:
    case ActionType.NotifyRequester:
    case ActionType.NotifySubscribers:
      return (
        <div className="text-sm text-gray-500">
          No additional parameters required
        </div>
      );

    default:
      return (
        <div className="text-sm text-gray-500">
          No additional parameters required
        </div>
      );
  }
};
