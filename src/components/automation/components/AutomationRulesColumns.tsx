import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { BaseButton, Icon } from '@brainforgeau/components';
import { Chip, Switch } from '@heroui/react';
import type { AutomationRuleRow } from '../types';
import { AutomationTriggerType } from '@/types/automation';

const columnHelper = createColumnHelper<AutomationRuleRow>();

const TRIGGER_TYPE_LABELS: Record<AutomationTriggerType, string> = {
  [AutomationTriggerType.TicketCreated]: 'Ticket Created',
  [AutomationTriggerType.TicketUpdated]: 'Ticket Updated',
  [AutomationTriggerType.TicketStatusChanged]: 'Status Changed',
  [AutomationTriggerType.CommentAdded]: 'Comment Added',
  [AutomationTriggerType.TicketAssigned]: 'Ticket Assigned',
  [AutomationTriggerType.TicketClosed]: 'Ticket Closed',
  [AutomationTriggerType.TicketReopened]: 'Ticket Reopened',
  [AutomationTriggerType.TicketOverdue]: 'Ticket Overdue',
  [AutomationTriggerType.TicketNotUpdated]: 'Not Updated',
  [AutomationTriggerType.TicketPriorityChanged]: 'Priority Changed',
  [AutomationTriggerType.TicketCategoryChanged]: 'Category Changed',
  [AutomationTriggerType.TicketTagAdded]: 'Tag Added',
  [AutomationTriggerType.TicketTagRemoved]: 'Tag Removed',
  [AutomationTriggerType.TicketDueDateChanged]: 'Due Date Changed',
};

interface CreateAutomationRulesColumnsProps {
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export const createAutomationRulesColumns = ({
  onEdit,
  onDelete,
  onToggleEnabled,
  onMoveUp,
  onMoveDown,
  onDuplicate,
}: CreateAutomationRulesColumnsProps): ColumnDef<AutomationRuleRow, any>[] => [
  columnHelper.accessor('sortOrder', {
    header: 'Order',
    cell: (info) => (
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium">{info.getValue()}</span>
        <div className="flex flex-col">
          <BaseButton
            variant="light"
            size="sm"
            isIconOnly
            onPress={() => onMoveUp(info.row.original.id)}
            className="h-4 w-4 min-w-0 p-0"
            title="Move Up"
          >
            <Icon name="chevron-up" className="h-3 w-3" />
          </BaseButton>
          <BaseButton
            variant="light"
            size="sm"
            isIconOnly
            onPress={() => onMoveDown(info.row.original.id)}
            className="h-4 w-4 min-w-0 p-0"
            title="Move Down"
          >
            <Icon name="chevron-down" className="h-3 w-3" />
          </BaseButton>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('name', {
    header: 'Name',
    cell: (info) => (
      <div>
        <div className="font-medium">{info.getValue()}</div>
        {info.row.original.description && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {info.row.original.description}
          </div>
        )}
      </div>
    ),
  }),
  columnHelper.accessor('triggerType', {
    header: 'Trigger',
    cell: (info) => {
      const type = info.getValue() as AutomationTriggerType;
      return (
        <Chip size="sm" variant="flat" color="primary">
          {TRIGGER_TYPE_LABELS[type]}
        </Chip>
      );
    },
  }),
  columnHelper.accessor('conditionCount', {
    header: 'Conditions',
    cell: (info) => (
      <Chip size="sm" variant="flat" color="default">
        {info.getValue()}
      </Chip>
    ),
  }),
  columnHelper.accessor('actionCount', {
    header: 'Actions',
    cell: (info) => (
      <Chip size="sm" variant="flat" color="default">
        {info.getValue()}
      </Chip>
    ),
  }),
  columnHelper.accessor('executionCount', {
    header: 'Executions',
    cell: (info) => (
      <div className="text-sm">
        {info.getValue().toLocaleString()}
      </div>
    ),
  }),
  columnHelper.accessor('isEnabled', {
    header: 'Enabled',
    cell: (info) => (
      <Switch
        size="sm"
        isSelected={info.getValue()}
        onValueChange={(enabled) => onToggleEnabled(info.row.original.id, enabled)}
      />
    ),
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: (info) => (
      <div className="flex items-center gap-1">
        <BaseButton
          variant="light"
          size="sm"
          isIconOnly
          onPress={() => onEdit(info.row.original.id)}
          title="Edit"
        >
          <Icon name="pencil" className="h-4 w-4" />
        </BaseButton>
        <BaseButton
          variant="light"
          size="sm"
          isIconOnly
          onPress={() => onDuplicate(info.row.original.id)}
          title="Duplicate"
        >
          <Icon name="document-duplicate" className="h-4 w-4" />
        </BaseButton>
        <BaseButton
          variant="light"
          size="sm"
          isIconOnly
          onPress={() => onDelete(info.row.original.id)}
          title="Delete"
          color="danger"
        >
          <Icon name="trash" className="h-4 w-4" />
        </BaseButton>
      </div>
    ),
  }),
];

export { TRIGGER_TYPE_LABELS };
