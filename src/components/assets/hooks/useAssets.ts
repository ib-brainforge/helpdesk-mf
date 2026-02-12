import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AssetsApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { AssetListDto, AssetDto, PagedResult, CreateAssetDto, UpdateAssetDto } from '@/types';

export const useAssets = (page = 1, pageSize = 20) => {
  return useQuery<PagedResult<AssetListDto>>({
    queryKey: ['assets', page, pageSize],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(AssetsApi);
      const { data } = await client.v1AssetsGet(page, pageSize);
      // REVIEW: Type mapping from generated types to local types
      return (data as unknown) as PagedResult<AssetListDto>;
    },
  });
};

export const useAsset = (id: string) => {
  return useQuery<AssetDto>({
    queryKey: ['asset', id],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(AssetsApi);
      const { data } = await client.v1AssetsIdGet(id);
      // REVIEW: Type mapping from generated types to local types
      return (data as unknown) as AssetDto;
    },
    enabled: !!id,
  });
};

export const useCreateAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (asset: CreateAssetDto) => {
      const client = await createHelpdeskApiClient(AssetsApi);
      // REVIEW: API schema uses different property names - mapping to generated types
      const { data } = await client.v1AssetsPost({
        modelName: asset.model,
        serialNumber: asset.serialNumber,
        location: asset.location,
        comments: asset.description,
        quantity: 1,
        assetTypeName: asset.assetType !== undefined ? ['Hardware', 'Software', 'Equipment', 'Other'][asset.assetType] : undefined,
        manufacturerName: asset.manufacturer,
        supplierName: asset.supplier,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
};

export const useUpdateAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateAssetDto }) => {
      const client = await createHelpdeskApiClient(AssetsApi);
      // REVIEW: API schema uses different property names - mapping to generated types
      const { data } = await client.v1AssetsIdPut(id, {
        id: id,
        modelName: updates.model,
        serialNumber: updates.serialNumber,
        location: updates.location,
        comments: updates.description || updates.notes,
        quantity: 1,
        assetTypeName: updates.assetType !== undefined ? ['Hardware', 'Software', 'Equipment', 'Other'][updates.assetType] : undefined,
        manufacturerName: updates.manufacturer,
        supplierName: updates.supplier,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset', variables.id] });
    },
  });
};
