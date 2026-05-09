import {
  BaseButton,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
  Icon,
} from '@brainforgeau/components';

import { type FC, useState } from 'react';
import { toast } from '@heroui/react';
import { useLinkedAssets, useLinkAsset, useUnlinkAsset } from '../hooks/useTickets';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (assetId: string) => void;
  isLoading?: boolean;
}

const AddAssetModal: FC<AddAssetModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [assetId, setAssetId] = useState('');

  const handleConfirm = () => {
    const trimmed = assetId.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    setAssetId('');
  };

  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isInvalid = !!assetId.trim() && !UUID_REGEX.test(assetId.trim());

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="sm">
      <BaseModalContent>
        <BaseModalHeader title="Link Asset">Link Asset</BaseModalHeader>
        <BaseModalBody>
          <BaseInput
            label="Asset ID"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={assetId}
            onChange={e => setAssetId(e.target.value)}
            description="Enter the UUID of the asset to link"
            isInvalid={isInvalid}
            errorMessage={isInvalid ? 'Enter a valid UUID' : undefined}
            isRequired
          />
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton
            variant="bordered"
            onPress={onClose}
            isDisabled={isLoading || isLoading}
          >
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleConfirm}
            isDisabled={!assetId.trim() || isInvalid}

          >
            Link
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};

interface LinkedAssetsSectionProps {
  ticketId: string;
}

export const LinkedAssetsSection: FC<LinkedAssetsSectionProps> = ({
  ticketId,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { data: assets, isLoading } = useLinkedAssets(ticketId);
  const linkAssetMutation = useLinkAsset();
  const unlinkAssetMutation = useUnlinkAsset();

  const handleAdd = (assetId: string) => {
    linkAssetMutation.mutate(
      { ticketId, assetId },
      {
        onSuccess: () => {
          toast('Asset linked', { description: `Asset ${assetId.substring(0, 8)}... linked to ticket.`, variant: 'success' });
          setIsAddModalOpen(false);
        },
        onError: () => {
          toast('Error', { description: 'Failed to link asset. Please try again.', variant: 'danger' });
        },
      },
    );
  };

  const handleUnlink = (assetId: string) => {
    unlinkAssetMutation.mutate(
      { ticketId, assetId },
      {
        onSuccess: () => {
          toast('Asset unlinked', { description: 'Asset removed from ticket.', variant: 'success' });
        },
        onError: () => {
          toast('Error', { description: 'Failed to unlink asset. Please try again.', variant: 'danger' });
        },
      },
    );
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Assets
        </label>
        <BaseButton
          size="sm"
          variant="light"
          icon={<Icon name="plus" className="h-3 w-3" />}
          onPress={() => setIsAddModalOpen(true)}
        >
          Add
        </BaseButton>
      </div>

      {isLoading ? (
        <p className="text-xs text-gray-400">Loading assets...</p>
      ) : assets && assets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {assets.map(asset => (
            <div
              key={asset.id}
              className="flex items-center gap-1 bg-default-100 rounded-full px-2 py-1 text-xs"
            >
              <span className="font-mono">
                {asset.assetId?.substring(0, 8)}...
              </span>
              <button
                type="button"
                className="ml-1 text-gray-400 hover:text-danger-600 transition-colors"
                onClick={() => asset.assetId && handleUnlink(asset.assetId)}
                aria-label={`Remove asset ${asset.assetId}`}
              >
                <Icon name="x-mark" className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">No assets linked</p>
      )}

      <AddAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onConfirm={handleAdd}
        isLoading={linkAssetMutation.isPending}
      />
    </div>
  );
};
