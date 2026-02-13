import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { BaseButton, Icon } from '@brainforgeau/components';
import { StatusBadge } from '@/components/shared';
import type { MailServerRow } from '../types';
import { MailProtocol } from '@/types/email';

const columnHelper = createColumnHelper<MailServerRow>();

interface CreateMailServersColumnsProps {
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
}

export const createMailServersColumns = ({
  onEdit,
  onDelete,
  onTest,
}: CreateMailServersColumnsProps): ColumnDef<MailServerRow, any>[] => [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('protocol', {
    header: 'Protocol',
    cell: (info) => {
      const protocol = info.getValue();
      return (
        <StatusBadge>
          {protocol === MailProtocol.Imap ? 'IMAP' : 'POP3'}
        </StatusBadge>
      );
    },
  }),
  columnHelper.accessor('inboundHost', {
    header: 'Inbound Host',
    cell: (info) => (
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {info.getValue()}:{info.row.original.inboundPort}
      </span>
    ),
  }),
  columnHelper.accessor('outboundHost', {
    header: 'Outbound Host',
    cell: (info) => (
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {info.getValue()}:{info.row.original.outboundPort}
      </span>
    ),
  }),
  columnHelper.accessor('useSsl', {
    header: 'SSL',
    cell: (info) => (
      <StatusBadge color={info.getValue() ? 'success' : 'default'}>
        {info.getValue() ? 'Enabled' : 'Disabled'}
      </StatusBadge>
    ),
  }),
  columnHelper.accessor('isActive', {
    header: 'Status',
    cell: (info) => (
      <StatusBadge color={info.getValue() ? 'success' : 'default'}>
        {info.getValue() ? 'Active' : 'Inactive'}
      </StatusBadge>
    ),
  }),
  columnHelper.accessor('healthStatus', {
    header: 'Health',
    cell: (info) => {
      const status = info.getValue();
      const color = status === 'Healthy' ? 'success' : status === 'Unhealthy' ? 'danger' : 'warning';
      return status ? (
        <StatusBadge color={color}>
          {status}
        </StatusBadge>
      ) : (
        <span className="text-sm text-gray-400">Unknown</span>
      );
    },
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
          onPress={() => onTest(info.row.original.id)}
          title="Test Connection"
        >
          <Icon name="signal" className="h-4 w-4" />
        </BaseButton>
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
