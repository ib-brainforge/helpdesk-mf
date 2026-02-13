import { useParams } from '@modern-js/runtime/router';
import { Helmet } from '@modern-js/runtime/head';
import { Suspense } from 'react';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { BaseButton } from '@brainforgeau/components/button';
import { Icon } from '@brainforgeau/components/base';
import { Chip, Card, CardBody, CardHeader, Divider } from '@heroui/react';
import { useAsset } from '@/components/assets/hooks/useAssets';
import { AssetStatus, AssetType } from '@/types';
import { Breadcrumbs } from '@/components/Breadcrumbs';

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
      return 'Under Maintenance';
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

function AssetDetailPageContent({ id }: { id: string }) {
  const { data: asset, isLoading, error } = useAsset(id);

  if (isLoading) {
    return <PageSpinner title="Loading asset details..." />;
  }

  if (error || !asset) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Icon name="warning" className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Asset not found
        </h2>
        <p className="text-muted-foreground mb-4">
          The asset you're looking for doesn't exist or has been removed.
        </p>
        <BaseButton href="/assets" variant="light">
          Back to Assets
        </BaseButton>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{asset.name} - Asset Details</title>
      </Helmet>

      <div className="mb-5">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Assets', href: '/assets' },
            { label: asset.name, href: `/assets/${id}`, isCurrent: true },
          ]}
        />

        <div className="max-w-6xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold">{asset.name}</h1>
                <Chip size="sm" color={getStatusColor(asset.status)} variant="flat">
                  {getStatusLabel(asset.status)}
                </Chip>
              </div>
              <p className="text-sm text-default-400">
                {getTypeLabel(asset.assetType)} • Created {new Date(asset.createdAt).toLocaleDateString()}
              </p>
            </div>
            <BaseButton
              color="primary"
              as="a"
              href={`/assets/${id}/edit`}
              icon={<Icon name="pencil" className="h-4 w-4" />}
            >
              Edit Asset
            </BaseButton>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Basic Information</h2>
                </CardHeader>
                <Divider />
                <CardBody className="space-y-3">
                  {asset.description && (
                    <div>
                      <p className="text-sm text-default-400">Description</p>
                      <p className="text-sm">{asset.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-default-400">Type</p>
                      <p className="text-sm font-medium">{getTypeLabel(asset.assetType)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-default-400">Status</p>
                      <Chip size="sm" color={getStatusColor(asset.status)} variant="flat">
                        {getStatusLabel(asset.status)}
                      </Chip>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Asset Details */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Asset Details</h2>
                </CardHeader>
                <Divider />
                <CardBody>
                  <div className="grid grid-cols-2 gap-4">
                    {asset.manufacturer && (
                      <div>
                        <p className="text-sm text-default-400">Manufacturer</p>
                        <p className="text-sm font-medium">{asset.manufacturer}</p>
                      </div>
                    )}
                    {asset.model && (
                      <div>
                        <p className="text-sm text-default-400">Model</p>
                        <p className="text-sm font-medium">{asset.model}</p>
                      </div>
                    )}
                    {asset.serialNumber && (
                      <div>
                        <p className="text-sm text-default-400">Serial Number</p>
                        <p className="text-sm font-medium">{asset.serialNumber}</p>
                      </div>
                    )}
                    {asset.location && (
                      <div>
                        <p className="text-sm text-default-400">Location</p>
                        <p className="text-sm font-medium">{asset.location}</p>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>

              {/* Purchase Information */}
              {(asset.supplier || asset.purchaseDate || asset.purchaseCost || asset.warrantyExpiryDate) && (
                <Card>
                  <CardHeader>
                    <h2 className="text-lg font-semibold">Purchase Information</h2>
                  </CardHeader>
                  <Divider />
                  <CardBody>
                    <div className="grid grid-cols-2 gap-4">
                      {asset.supplier && (
                        <div>
                          <p className="text-sm text-default-400">Supplier</p>
                          <p className="text-sm font-medium">{asset.supplier}</p>
                        </div>
                      )}
                      {asset.purchaseDate && (
                        <div>
                          <p className="text-sm text-default-400">Purchase Date</p>
                          <p className="text-sm font-medium">
                            {new Date(asset.purchaseDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {asset.purchaseCost !== undefined && (
                        <div>
                          <p className="text-sm text-default-400">Purchase Cost</p>
                          <p className="text-sm font-medium">${asset.purchaseCost.toFixed(2)}</p>
                        </div>
                      )}
                      {asset.currentValue !== undefined && (
                        <div>
                          <p className="text-sm text-default-400">Current Value</p>
                          <p className="text-sm font-medium">${asset.currentValue.toFixed(2)}</p>
                        </div>
                      )}
                      {asset.warrantyExpiryDate && (
                        <div>
                          <p className="text-sm text-default-400">Warranty Expiry</p>
                          <p className="text-sm font-medium">
                            {new Date(asset.warrantyExpiryDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Notes */}
              {asset.notes && (
                <Card>
                  <CardHeader>
                    <h2 className="text-lg font-semibold">Notes</h2>
                  </CardHeader>
                  <Divider />
                  <CardBody>
                    <p className="text-sm whitespace-pre-wrap">{asset.notes}</p>
                  </CardBody>
                </Card>
              )}
            </div>

            {/* Right Column - Assignment & Linked Data */}
            <div className="space-y-6">
              {/* Assignment */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Assignment</h2>
                </CardHeader>
                <Divider />
                <CardBody>
                  {asset.assignedToUserName ? (
                    <div>
                      <p className="text-sm text-default-400 mb-1">Assigned To</p>
                      <p className="text-sm font-medium">{asset.assignedToUserName}</p>
                      {/* REVIEW: Assignment history and management to be implemented */}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-default-400 mb-3">Not assigned</p>
                      {/* REVIEW: Assign button to be implemented */}
                      <BaseButton size="sm" variant="bordered" isDisabled>
                        Assign to User
                      </BaseButton>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Linked Tickets */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Linked Tickets</h2>
                </CardHeader>
                <Divider />
                <CardBody>
                  <div className="text-center py-4">
                    <p className="text-sm text-default-400 mb-3">No linked tickets</p>
                    {/* REVIEW: Link ticket functionality to be implemented */}
                    <BaseButton size="sm" variant="bordered" isDisabled>
                      Link to Ticket
                    </BaseButton>
                  </div>
                </CardBody>
              </Card>

              {/* Custom Fields */}
              {asset.customFields && Object.keys(asset.customFields).length > 0 && (
                <Card>
                  <CardHeader>
                    <h2 className="text-lg font-semibold">Custom Fields</h2>
                  </CardHeader>
                  <Divider />
                  <CardBody>
                    <div className="space-y-3">
                      {Object.entries(asset.customFields).map(([key, value]) => (
                        <div key={key}>
                          <p className="text-sm text-default-400">{key}</p>
                          <p className="text-sm font-medium">{value}</p>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Metadata */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Metadata</h2>
                </CardHeader>
                <Divider />
                <CardBody className="space-y-3">
                  <div>
                    <p className="text-sm text-default-400">Created</p>
                    <p className="text-sm">{new Date(asset.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-default-400">Last Updated</p>
                    <p className="text-sm">{new Date(asset.updatedAt).toLocaleString()}</p>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function AssetDetailPage() {
  const { id } = useParams();

  if (!id) {
    return <PageSpinner title="Loading..." />;
  }

  return (
    <Suspense fallback={<PageSpinner title="Loading..." />}>
      <AssetDetailPageContent id={id} />
    </Suspense>
  );
}

export default withAuthenticationRequired(AssetDetailPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
