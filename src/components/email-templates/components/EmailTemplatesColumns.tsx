import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { BaseButton, Icon } from '@brainforgeau/components';
import { Chip } from '@heroui/react';
import type { EmailTemplateRow } from '../types';
import { NotificationType } from '@/types/email-template';

const columnHelper = createColumnHelper<EmailTemplateRow>();

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  [NotificationType.TicketCreated]: 'Ticket Created',
  [NotificationType.CommentAdded]: 'Comment Added',
  [NotificationType.TicketAssigned]: 'Ticket Assigned',
  [NotificationType.StatusChanged]: 'Status Changed',
  [NotificationType.TicketClosed]: 'Ticket Closed',
  [NotificationType.TicketReopened]: 'Ticket Reopened',
  [NotificationType.SlaWarning]: 'SLA Warning',
  [NotificationType.SlaBreach]: 'SLA Breach',
  [NotificationType.InternalNote]: 'Internal Note',
  [NotificationType.TicketMerged]: 'Ticket Merged',
  [NotificationType.WeeklyDigest]: 'Weekly Digest',
};

interface CreateEmailTemplatesColumnsProps {
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const createEmailTemplatesColumns = ({
  onEdit,
  onDelete,
}: CreateEmailTemplatesColumnsProps): ColumnDef<EmailTemplateRow, any>[] => [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('notificationType', {
    header: 'Notification Type',
    cell: (info) => {
      const type = info.getValue() as NotificationType;
      return (
        <Chip size="sm" variant="flat" color="primary">
          {NOTIFICATION_TYPE_LABELS[type]}
        </Chip>
      );
    },
  }),
  columnHelper.accessor('subject', {
    header: 'Subject',
    cell: (info) => (
      <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('isActive', {
    header: 'Status',
    cell: (info) => (
      <Chip size="sm" variant="flat" color={info.getValue() ? 'success' : 'default'}>
        {info.getValue() ? 'Active' : 'Inactive'}
      </Chip>
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

export { NOTIFICATION_TYPE_LABELS };
