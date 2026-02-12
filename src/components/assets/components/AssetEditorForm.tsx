import { type FC, useCallback } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { useNavigate } from '@modern-js/runtime/router';
import {
  BaseButton,
  BaseInput,
  BaseTextarea,
  BaseSelect,
  BaseSelectItem,
  Icon,
} from '@brainforgeau/components';
import { addToast } from '@heroui/react';
import { useCreateAsset, useUpdateAsset } from '../hooks/useAssets';
import { AssetStatus, AssetType, type AssetDto, type CreateAssetDto, type UpdateAssetDto } from '@/types';

const assetFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  assetType: z.nativeEnum(AssetType),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  status: z.nativeEnum(AssetStatus),
  description: z.string().optional(),
  supplier: z.string().optional(),
  location: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseCost: z.number().optional(),
  currentValue: z.number().optional(),
  warrantyExpiryDate: z.string().optional(),
  notes: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetFormSchema>;

interface AssetEditorFormProps {
  asset?: AssetDto;
  mode: 'create' | 'edit';
}

const ASSET_TYPE_OPTIONS = [
  { id: AssetType.Hardware, name: 'Hardware' },
  { id: AssetType.Software, name: 'Software' },
  { id: AssetType.Equipment, name: 'Equipment' },
  { id: AssetType.Other, name: 'Other' },
];

const ASSET_STATUS_OPTIONS = [
  { id: AssetStatus.Available, name: 'Available' },
  { id: AssetStatus.InUse, name: 'In Use' },
  { id: AssetStatus.UnderMaintenance, name: 'Under Maintenance' },
  { id: AssetStatus.Retired, name: 'Retired' },
  { id: AssetStatus.Lost, name: 'Lost' },
];

export const AssetEditorForm: FC<AssetEditorFormProps> = ({ asset, mode }) => {
  const navigate = useNavigate();
  const createAssetMutation = useCreateAsset();
  const updateAssetMutation = useUpdateAsset();

  const form = useForm({
    defaultValues: {
      name: asset?.name || '',
      assetType: asset?.assetType ?? AssetType.Hardware,
      manufacturer: asset?.manufacturer || '',
      model: asset?.model || '',
      serialNumber: asset?.serialNumber || '',
      status: asset?.status ?? AssetStatus.Available,
      description: asset?.description || '',
      supplier: asset?.supplier || '',
      location: asset?.location || '',
      purchaseDate: asset?.purchaseDate || '',
      purchaseCost: asset?.purchaseCost,
      currentValue: asset?.currentValue,
      warrantyExpiryDate: asset?.warrantyExpiryDate || '',
      notes: asset?.notes || '',
    } as AssetFormData,
    validators: {
      onChange: assetFormSchema,
      onSubmit: assetFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        if (mode === 'create') {
          const createDto: CreateAssetDto = {
            name: value.name,
            assetType: value.assetType,
            manufacturer: value.manufacturer || undefined,
            model: value.model || undefined,
            serialNumber: value.serialNumber || undefined,
            status: value.status,
            description: value.description || undefined,
            supplier: value.supplier || undefined,
            location: value.location || undefined,
            purchaseDate: value.purchaseDate || undefined,
            purchaseCost: value.purchaseCost,
            warrantyExpiryDate: value.warrantyExpiryDate || undefined,
          };

          const result: any = await createAssetMutation.mutateAsync(createDto);
          addToast({ title: 'Asset created successfully', severity: 'success' });

          if (result?.id) {
            navigate(`/assets/${result.id}/edit`);
          } else {
            navigate('/assets');
          }
        } else if (asset?.id) {
          const updateDto: UpdateAssetDto = {
            name: value.name,
            assetType: value.assetType,
            manufacturer: value.manufacturer || undefined,
            model: value.model || undefined,
            serialNumber: value.serialNumber || undefined,
            status: value.status,
            description: value.description || undefined,
            supplier: value.supplier || undefined,
            location: value.location || undefined,
            purchaseDate: value.purchaseDate || undefined,
            purchaseCost: value.purchaseCost,
            currentValue: value.currentValue,
            warrantyExpiryDate: value.warrantyExpiryDate || undefined,
            notes: value.notes || undefined,
          };

          await updateAssetMutation.mutateAsync({ id: asset.id, updates: updateDto });
          addToast({ title: 'Asset updated successfully', severity: 'success' });
        }
      } catch (error) {
        // REVIEW: Error handled by global axios interceptor
        console.error('Failed to save asset:', error);
      }
    },
  });

  const handleCancel = useCallback(() => {
    navigate('/assets');
  }, [navigate]);

  const formatFormErrors = (errors: any[]): string | undefined => {
    if (!errors || errors.length === 0) return undefined;
    return errors.map(e => (typeof e === 'string' ? e : e.message || String(e))).join(', ');
  };

  const isLoading = createAssetMutation.isPending || updateAssetMutation.isPending;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {mode === 'create' ? 'Create New Asset' : `Edit Asset: ${asset?.name}`}
        </h1>
      </div>

      {/* Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        {/* Basic Information */}
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

          <form.Field name="name">
            {(field) => (
              <BaseInput
                label="Asset Name"
                isRequired
                placeholder="Enter asset name"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                errorMessage={formatFormErrors(field.state.meta.errors)}
                isInvalid={field.state.meta.errors.length > 0}
              />
            )}
          </form.Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field name="assetType">
              {(field) => (
                <BaseSelect
                  label="Asset Type"
                  isRequired
                  selectedKeys={[String(field.state.value)]}
                  onSelectionChange={(keys) => {
                    const newValue = Number(keys.currentKey) as AssetType;
                    field.handleChange(newValue);
                  }}
                  errorMessage={formatFormErrors(field.state.meta.errors)}
                  isInvalid={field.state.meta.errors.length > 0}
                >
                  {ASSET_TYPE_OPTIONS.map((type) => (
                    <BaseSelectItem key={String(type.id)}>{type.name}</BaseSelectItem>
                  ))}
                </BaseSelect>
              )}
            </form.Field>

            <form.Field name="status">
              {(field) => (
                <BaseSelect
                  label="Status"
                  isRequired
                  selectedKeys={[String(field.state.value)]}
                  onSelectionChange={(keys) => {
                    const newValue = Number(keys.currentKey) as AssetStatus;
                    field.handleChange(newValue);
                  }}
                  errorMessage={formatFormErrors(field.state.meta.errors)}
                  isInvalid={field.state.meta.errors.length > 0}
                >
                  {ASSET_STATUS_OPTIONS.map((status) => (
                    <BaseSelectItem key={String(status.id)}>{status.name}</BaseSelectItem>
                  ))}
                </BaseSelect>
              )}
            </form.Field>
          </div>

          <form.Field name="description">
            {(field) => (
              <BaseTextarea
                label="Description"
                placeholder="Optional description"
                value={field.state.value ?? ''}
                onValueChange={(value) => field.handleChange(value || '')}
                minRows={3}
              />
            )}
          </form.Field>
        </div>

        {/* Asset Details */}
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Asset Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field name="manufacturer">
              {(field) => (
                <BaseInput
                  label="Manufacturer"
                  placeholder="Enter manufacturer"
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value || '')}
                />
              )}
            </form.Field>

            <form.Field name="model">
              {(field) => (
                <BaseInput
                  label="Model"
                  placeholder="Enter model"
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value || '')}
                />
              )}
            </form.Field>

            <form.Field name="serialNumber">
              {(field) => (
                <BaseInput
                  label="Serial Number"
                  placeholder="Enter serial number"
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value || '')}
                />
              )}
            </form.Field>

            <form.Field name="location">
              {(field) => (
                <BaseInput
                  label="Location"
                  placeholder="Enter location"
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value || '')}
                />
              )}
            </form.Field>
          </div>
        </div>

        {/* Purchase Information */}
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Purchase Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field name="supplier">
              {(field) => (
                <BaseInput
                  label="Supplier"
                  placeholder="Enter supplier"
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value || '')}
                />
              )}
            </form.Field>

            <form.Field name="purchaseDate">
              {(field) => (
                <BaseInput
                  label="Purchase Date"
                  type="date"
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value || '')}
                />
              )}
            </form.Field>

            <form.Field name="purchaseCost">
              {(field) => (
                <BaseInput
                  label="Purchase Cost"
                  type="number"
                  placeholder="0.00"
                  value={field.state.value?.toString() ?? ''}
                  onChange={(e) => field.handleChange(e.target.value ? Number(e.target.value) : undefined)}
                />
              )}
            </form.Field>

            {mode === 'edit' && (
              <form.Field name="currentValue">
                {(field) => (
                  <BaseInput
                    label="Current Value"
                    type="number"
                    placeholder="0.00"
                    value={field.state.value?.toString() ?? ''}
                    onChange={(e) => field.handleChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                )}
              </form.Field>
            )}

            <form.Field name="warrantyExpiryDate">
              {(field) => (
                <BaseInput
                  label="Warranty Expiry Date"
                  type="date"
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value || '')}
                />
              )}
            </form.Field>
          </div>
        </div>

        {/* Notes (only in edit mode) */}
        {mode === 'edit' && (
          <div className="rounded-lg border p-6 space-y-4">
            <h2 className="text-lg font-semibold mb-4">Notes</h2>
            <form.Field name="notes">
              {(field) => (
                <BaseTextarea
                  label="Internal Notes"
                  placeholder="Add notes about this asset"
                  value={field.state.value ?? ''}
                  onValueChange={(value) => field.handleChange(value || '')}
                  minRows={4}
                />
              )}
            </form.Field>
          </div>
        )}

        {/* Asset Assignment (placeholder for edit mode) */}
        {mode === 'edit' && asset && (
          <div className="rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Asset Assignment</h2>
            <div className="text-sm text-default-400">
              {/* REVIEW: Asset assignment feature to be implemented */}
              Assign this asset to users or link to tickets (to be implemented)
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t">
          <BaseButton
            variant="bordered"
            onPress={handleCancel}
            isDisabled={isLoading}
          >
            Cancel
          </BaseButton>
          <BaseButton
            type="submit"
            color="primary"
            isLoading={isLoading}
            icon={<Icon name="check" className="h-4 w-4" />}
          >
            {mode === 'create' ? 'Create Asset' : 'Save Changes'}
          </BaseButton>
        </div>
      </form>
    </div>
  );
};
