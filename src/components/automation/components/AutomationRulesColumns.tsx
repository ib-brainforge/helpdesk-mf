import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { BaseButton, Icon } from '@brainforgeau/components';
import { Switch } from '@heroui/react';
import { StatusBadge } from '@/components/shared';
import type { AutomationRuleRow } from '../types';
import { AutomationTriggerType } from '@/types/automation';
import { ChevronUpIcon, ChevronDownIcon, DocumentDuplicateIcon } from '@heroicons/react/24/solid';

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
            variant="link"
            size="none"
            className="text-foreground hover:text-blue"
            aria-label="Move up"
            onPress={() => onMoveUp(info.row.original.id)}
            icon={<ChevronUpIcon className="h-3.5 w-3.5" />}
          />
          <BaseButton
            variant="link"
            size="none"
            className="text-foreground hover:text-blue"
            aria-label="Move down"
            onPress={() => onMoveDown(info.row.original.id)}
            icon={<ChevronDownIcon className="h-3.5 w-3.5" />}
          />
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
        <StatusBadge color="primary">
          {TRIGGER_TYPE_LABELS[type]}
        </StatusBadge>
      );
    },
  }),
  columnHelper.accessor('conditionCount', {
    header: 'Conditions',
    cell: (info) => (
      <StatusBadge>
        {info.getValue()}
      </StatusBadge>
    ),
  }),
  columnHelper.accessor('actionCount', {
    header: 'Actions',
    cell: (info) => (
      <StatusBadge>
        {info.getValue()}
      </StatusBadge>
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
    header: '',
    cell: (info) => (
      <div className="flex items-center justify-end gap-1">
        <BaseButton
          variant="link"
          size="none"
          className="text-foreground hover:text-blue"
          aria-label="Edit rule"
          onPress={() => onEdit(info.row.original.id)}
          icon={<Icon name="pencil" className="h-4 w-4" />}
        />
        <BaseButton
          variant="link"
          size="none"
          className="text-foreground hover:text-blue"
          aria-label="Duplicate rule"
          onPress={() => onDuplicate(info.row.original.id)}
          icon={<DocumentDuplicateIcon className="h-4 w-4" />}
        />
        <BaseButton
          variant="link"
          size="none"
          className="text-danger hover:text-danger-600"
          aria-label="Delete rule"
          onPress={() => onDelete(info.row.original.id)}
          icon={<Icon name="trash" className="h-4 w-4" />}
        />
      </div>
    ),
  }),
];

export { TRIGGER_TYPE_LABELS };
