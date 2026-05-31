import { StatusBadge } from '@/components/shared';
import { NotificationType } from '@/types/email-template';
import { BaseButton, Icon } from '@brainforgeau/components';
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import type { EmailTemplateRow } from '../types';

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
    cell: info => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('notificationType', {
    header: 'Notification Type',
    cell: info => {
      const type = info.getValue() as NotificationType;
      return (
        <StatusBadge color="primary">
          {NOTIFICATION_TYPE_LABELS[type]}
        </StatusBadge>
      );
    },
  }),
  columnHelper.accessor('subject', {
    header: 'Subject',
    cell: info => (
      <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('isActive', {
    header: 'Status',
    cell: info => (
      <StatusBadge color={info.getValue() ? 'success' : 'default'}>
        {info.getValue() ? 'Active' : 'Inactive'}
      </StatusBadge>
    ),
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: info => (
      <div className="-my-1.5 flex items-center justify-end gap-1">
        <BaseButton
          variant="link"
          size="none"
          className="text-dark dark:text-light hover:text-blue"
          aria-label="Edit email template"
          onPress={() => onEdit(info.row.original.id)}
          icon={<Icon name="pencil" className="h-4 w-4" />}
        />
        <BaseButton
          variant="link"
          size="none"
          className="text-danger hover:text-danger-600"
          aria-label="Delete email template"
          onPress={() => onDelete(info.row.original.id)}
          icon={<Icon name="trash" className="h-4 w-4" />}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 80,
  }),
];

export { NOTIFICATION_TYPE_LABELS };
