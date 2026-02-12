import type { ColumnDef } from '@tanstack/react-table';
import { BaseButton } from '@brainforgeau/components/button';
import { Icon } from '@brainforgeau/components/base';
import { Chip } from '@heroui/react';
import { AssetListDto, AssetStatus, AssetType } from '@/types';

interface CreateAssetColumnsProps {
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClone?: (id: string) => void;
}

const getStatusColor = (status: AssetStatus): 'success' | 'warning' | 'danger' | 'default' => {
  switch (status) {
    case AssetStatus.Available:
      return 'success';
    case AssetStatus.InUse:
      return 'warning';
    case AssetStatus.UnderMaintenance:
      return 'danger';
    case AssetStatus.Retired:
    case AssetStatus.Lost:
      return 'default';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: AssetStatus): string => {
  switch (status) {
    case AssetStatus.Available:
      return 'Available';
    case AssetStatus.InUse:
      return 'In Use';
    case AssetStatus.UnderMaintenance:
      return 'Maintenance';
    case AssetStatus.Retired:
      return 'Retired';
    case AssetStatus.Lost:
      return 'Lost';
    default:
      return 'Unknown';
  }
};

const getTypeLabel = (type: AssetType): string => {
  switch (type) {
    case AssetType.Hardware:
      return 'Hardware';
    case AssetType.Software:
      return 'Software';
    case AssetType.Equipment:
      return 'Equipment';
    case AssetType.Other:
      return 'Other';
    default:
      return 'Unknown';
  }
};

export const createAssetColumns = ({
  onEdit,
  onDelete,
  onClone,
}: CreateAssetColumnsProps): ColumnDef<AssetListDto, any>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: (info) => (
      <a
        href={`/assets/${info.row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {info.getValue() as string}
      </a>
    ),
  },
  {
    accessorKey: 'assetType',
    header: 'Type',
    cell: (info) => getTypeLabel(info.getValue() as AssetType),
  },
  {
    accessorKey: 'manufacturer',
    header: 'Manufacturer',
    cell: (info) => (info.getValue() as string) || 'N/A',
  },
  {
    accessorKey: 'serialNumber',
    header: 'Serial Number',
    cell: (info) => (info.getValue() as string) || 'N/A',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: (info) => {
      const status = info.getValue() as AssetStatus;
      return (
        <Chip size="sm" color={getStatusColor(status)} variant="flat">
          {getStatusLabel(status)}
        </Chip>
      );
    },
  },
  {
    accessorKey: 'assignedToUserName',
    header: 'Assigned To',
    cell: (info) => (info.getValue() as string) || 'Unassigned',
  },
  {
    accessorKey: 'location',
    header: 'Location',
    cell: (info) => (info.getValue() as string) || 'N/A',
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <div className="flex gap-1">
        {onEdit && (
          <BaseButton
            size="sm"
            variant="light"
            onPress={() => onEdit(row.original.id)}
            icon={<Icon name="pencil" className="h-3 w-3" />}
          />
        )}
        {onClone && (
          <BaseButton
            size="sm"
            variant="light"
            onPress={() => onClone(row.original.id)}
            icon={<Icon name="document-duplicate" className="h-3 w-3" />}
          />
        )}
        {onDelete && (
          <BaseButton
            size="sm"
            variant="light"
            color="danger"
            onPress={() => onDelete(row.original.id)}
            icon={<Icon name="trash" className="h-3 w-3" />}
          />
        )}
      </div>
    ),
  },
];
