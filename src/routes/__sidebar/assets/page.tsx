import { useMemo, useState } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { BaseTable } from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { Icon } from '@brainforgeau/components/base';
import { Select, SelectItem } from '@heroui/react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import { useAssets } from '@/components/assets/hooks/useAssets';
import { createAssetColumns } from '@/components/assets/components/asset-columns';
import { AssetStatus, AssetType } from '@/types';

function AssetsPage() {
  const [typeFilter, setTypeFilter] = useState<AssetType | ''>('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | ''>('');

  const { data: assets, isLoading } = useAssets();

  const handleEdit = (id: string) => {
    window.location.href = `/assets/${id}/edit`;
  };

  const handleClone = (id: string) => {
    // TODO: Implement clone
    console.log('Clone asset:', id);
  };

  const handleDelete = (id: string) => {
    // TODO: Implement delete with confirmation
    console.log('Delete asset:', id);
  };

  const columns = useMemo(
    () => createAssetColumns({ onEdit: handleEdit, onClone: handleClone, onDelete: handleDelete }),
    [],
  );

  const table = useReactTable({
    data: assets?.items || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <>
      <Helmet>
        <title>Asset Management</title>
      </Helmet>

      <div className="mb-5">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Asset Management</h1>
          <BaseButton
            color="primary"
            icon={<Icon name="plus" className="h-4 w-4" />}
            as="a"
            href="/assets/new"
          >
            Create Asset
          </BaseButton>
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-4">
          <Select
            placeholder="All Types"
            selectedKeys={typeFilter !== '' ? [typeFilter.toString()] : []}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0] as string;
              setTypeFilter(key ? parseInt(key, 10) : '');
            }}
            className="w-48"
          >
            <SelectItem key={AssetType.Hardware.toString()}>
              Hardware
            </SelectItem>
            <SelectItem key={AssetType.Software.toString()}>
              Software
            </SelectItem>
            <SelectItem key={AssetType.Equipment.toString()}>
              Equipment
            </SelectItem>
            <SelectItem key={AssetType.Other.toString()}>
              Other
            </SelectItem>
          </Select>

          <Select
            placeholder="All Statuses"
            selectedKeys={statusFilter !== '' ? [statusFilter.toString()] : []}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0] as string;
              setStatusFilter(key ? parseInt(key, 10) : '');
            }}
            className="w-48"
          >
            <SelectItem key={AssetStatus.Available.toString()}>
              Available
            </SelectItem>
            <SelectItem key={AssetStatus.InUse.toString()}>
              In Use
            </SelectItem>
            <SelectItem key={AssetStatus.UnderMaintenance.toString()}>
              Maintenance
            </SelectItem>
            <SelectItem key={AssetStatus.Retired.toString()}>
              Retired
            </SelectItem>
            <SelectItem key={AssetStatus.Lost.toString()}>
              Lost
            </SelectItem>
          </Select>
        </div>

        {/* Assets Table */}
        <BaseTable
          table={table}
          isLoading={isLoading}
          loading={{ title: 'Loading assets...' }}
          fullHeight
        />
      </div>
    </>
  );
}

export default AssetsPage;
