import { useMemo, useState, useCallback } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { useNavigate } from '@modern-js/runtime/router';
import { BaseTable } from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { Icon } from '@brainforgeau/components/base';
import { Select, SelectItem, addToast, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import { useAssets, useCloneAsset, useDeleteAsset } from '@/components/assets/hooks/useAssets';
import { createAssetColumns } from '@/components/assets/components/asset-columns';
import { AssetStatus, AssetType } from '@/types';

function AssetsPage() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<AssetType | ''>('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | ''>('');
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: assets, isLoading } = useAssets();
  const cloneAssetMutation = useCloneAsset();
  const deleteAssetMutation = useDeleteAsset();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleEdit = (id: string) => {
    navigate(`/assets/${id}/edit`);
  };

  const handleClone = useCallback(async (id: string) => {
    try {
      const clonedAsset = await cloneAssetMutation.mutateAsync(id);
      addToast({
        title: 'Asset cloned successfully',
        severity: 'success'
      });
      // REVIEW: Navigate to edit the cloned asset
      if (clonedAsset?.id) {
        navigate(`/assets/${clonedAsset.id}/edit`);
      }
    } catch (error) {
      // REVIEW: Error handled by global axios interceptor
      console.error('Failed to clone asset:', error);
    }
  }, [cloneAssetMutation, navigate]);

  const handleDeleteClick = useCallback((id: string) => {
    // Find the asset to get its name
    const asset = assets?.items?.find(a => a.id === id);
    if (asset) {
      setAssetToDelete({ id, name: asset.name });
      onOpen();
    }
  }, [assets, onOpen]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!assetToDelete) return;

    try {
      await deleteAssetMutation.mutateAsync(assetToDelete.id);
      addToast({
        title: 'Asset deleted successfully',
        severity: 'success'
      });
      onClose();
      setAssetToDelete(null);
    } catch (error) {
      // REVIEW: Error handled by global axios interceptor
      console.error('Failed to delete asset:', error);
    }
  }, [assetToDelete, deleteAssetMutation, onClose]);

  const columns = useMemo(
    () => createAssetColumns({ onEdit: handleEdit, onClone: handleClone, onDelete: handleDeleteClick }),
    [handleEdit, handleClone, handleDeleteClick],
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

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>Confirm Delete</ModalHeader>
          <ModalBody>
            <p>
              Are you sure you want to delete the asset{' '}
              <strong>{assetToDelete?.name}</strong>? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <BaseButton variant="bordered" onPress={onClose}>
              Cancel
            </BaseButton>
            <BaseButton
              color="danger"
              onPress={handleDeleteConfirm}
              isLoading={deleteAssetMutation.isPending}
            >
              Delete
            </BaseButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default AssetsPage;
