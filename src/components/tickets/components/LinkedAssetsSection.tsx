import { ModalHeader } from '@/components/shared';
import { useScopeNames } from '@/hooks/useScopeNames';
import type { ScopeOption } from '@/hooks/useScopeNames';
import {
  BaseAutocomplete,
  BaseAutocompleteItem,
  BaseButton,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  Icon,
} from '@brainforgeau/components';

import { toast } from '@heroui/react';
import { type FC, useEffect, useMemo, useState } from 'react';
import {
  type Asset,
  assetLabel,
  useAssetSearch,
  useAssetsByIds,
  useTrackedAssetIds,
} from '../hooks/useAssets';
import {
  useLinkAsset,
  useLinkedAssets,
  useUnlinkAsset,
} from '../hooks/useTickets';
import { TrackingBadge } from './TrackingBadge';

/**
 * A searchable single choice from a list already in memory (tenants,
 * organisations). BaseAutocomplete never filters its own items, so matching
 * is done here.
 */
const ScopeSelect: FC<{
  label: string;
  options: ScopeOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** Shown when nothing is chosen; also what "nothing chosen" means. */
  placeholder: string;
  isDisabled?: boolean;
}> = ({ label, options, value, onChange, placeholder, isDisabled }) => {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? options.filter(o => o.name.toLowerCase().includes(needle))
      : options;
  }, [options, query]);
  const selected = options.find(o => o.id === value);

  return (
    <BaseAutocomplete
      label={label}
      placeholder={placeholder}
      isDisabled={isDisabled}
      selectedKey={value}
      onSelectionChange={key => onChange(typeof key === 'string' ? key : null)}
      onValueChange={setQuery}
      onOpenChange={open => {
        if (!open) setQuery('');
      }}
      renderSelectedItem={() => (
        <span className="truncate text-xs font-medium">
          {selected?.name ?? placeholder}
        </span>
      )}
    >
      {visible.map(o => (
        <BaseAutocompleteItem key={o.id} id={o.id} textValue={o.name}>
          {o.name}
        </BaseAutocompleteItem>
      ))}
    </BaseAutocomplete>
  );
};

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (assetId: string, asset: Asset) => void;
  isLoading?: boolean;
  /** The ticket's own scope, which the pickers start from. */
  ticketTenantId?: string | null;
  ticketOrganisationId?: string | null;
  /** Already linked, so not offered again. */
  linkedIds: Set<string>;
}

/**
 * Link an asset by choosing it, not by pasting its id.
 *
 * Tenant, then organisation, then the asset. Someone who can work across
 * several tenants or organisations chooses where to look; an account limited
 * to one tenant and one organisation has both filled in and locked, and only
 * picks the asset. Both start from the ticket's own tenant and organisation,
 * since that is almost always where its assets are.
 *
 * The asset list is searched and paged by asset-backend (see useAssets), so it
 * stays usable for a tenant with hundreds of assets.
 */
const AddAssetModal: FC<AddAssetModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  ticketTenantId,
  ticketOrganisationId,
  linkedIds,
}) => {
  const { tenantOptions, organisationOptions, tenantWideIds } = useScopeNames();

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [organisationId, setOrganisationId] = useState<string | null>(null);
  const [assetQuery, setAssetQuery] = useState('');
  const [selected, setSelected] = useState<Asset | null>(null);

  const orgsForTenant = useMemo(
    () => organisationOptions.filter(o => o.parentId === tenantId),
    [organisationOptions, tenantId],
  );
  // Without tenant-wide access an organisation must be named: "all
  // organisations" is not a scope this account can look in.
  const canUseWholeTenant = !!tenantId && tenantWideIds.has(tenantId);
  const tenantLocked = tenantOptions.length <= 1;
  const orgLocked = !canUseWholeTenant && orgsForTenant.length <= 1;

  // Fill the scope each time the modal opens: the ticket's own tenant and
  // organisation where this account can see them, otherwise the only choice
  // there is.
  useEffect(() => {
    if (!isOpen) return;
    const tenant =
      tenantOptions.find(t => t.id === ticketTenantId)?.id ??
      (tenantOptions.length === 1 ? tenantOptions[0].id : null);
    setTenantId(tenant);
    setSelected(null);
    setAssetQuery('');
  }, [isOpen, tenantOptions, ticketTenantId]);

  useEffect(() => {
    if (!isOpen) return;
    const orgs = organisationOptions.filter(o => o.parentId === tenantId);
    const ticketOrg = orgs.find(o => o.id === ticketOrganisationId)?.id;
    const wholeTenant = !!tenantId && tenantWideIds.has(tenantId);
    setOrganisationId(
      ticketOrg ?? (!wholeTenant && orgs.length > 0 ? orgs[0].id : null),
    );
    setSelected(null);
  }, [
    isOpen,
    tenantId,
    organisationOptions,
    ticketOrganisationId,
    tenantWideIds,
  ]);

  // Only an organisation of the CHOSEN tenant counts. Right after the tenant
  // changes, the previous tenant's organisation is still in state for one
  // render, and asking identity for a token for that mismatched pair is a 404.
  const scopeOrganisationId = orgsForTenant.some(o => o.id === organisationId)
    ? organisationId
    : null;
  const scopeReady = !!tenantId && (canUseWholeTenant || !!scopeOrganisationId);
  const {
    assets,
    totalCount,
    isLoading: assetsLoading,
    isError,
  } = useAssetSearch(
    assetQuery,
    { tenantId, organisationId: scopeOrganisationId },
    { enabled: isOpen && scopeReady },
  );
  const choices = assets.filter(a => !linkedIds.has(a.id));
  // Which of this scope's assets exist in Tracking, read once per scope.
  const {
    trackedIds,
    isLoading: trackingLoading,
    isError: trackingError,
  } = useTrackedAssetIds(
    { tenantId, organisationId: scopeOrganisationId },
    { enabled: isOpen && scopeReady },
  );

  const status = !scopeReady
    ? 'Choose a tenant and organisation first'
    : isError
      ? "Couldn't load assets for this scope"
      : assetsLoading && choices.length === 0
        ? 'Loading assets...'
        : choices.length === 0
          ? assetQuery.trim()
            ? `No assets match "${assetQuery.trim()}"`
            : 'No assets in this scope'
          : null;

  const handleClose = () => {
    setSelected(null);
    setAssetQuery('');
    onClose();
  };

  /*
   * How much of the scope the list shows, as a disabled last row INSIDE the
   * dropdown. It used to be the field's description, which appeared and
   * disappeared with the search text and the dropdown's open state, so the
   * dialog grew and shrank by a line each time the dropdown opened or closed.
   */
  const moreRow =
    assets.length < totalCount
      ? [
          <BaseAutocompleteItem
            key="__more__"
            id="__more__"
            textValue="More results"
            isDisabled
          >
            <span className="text-light-gray text-[11px]">
              Showing {assets.length} of {totalCount}. Type to search for more.
            </span>
          </BaseAutocompleteItem>,
        ]
      : [];

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} size="sm">
      <BaseModalContent>
        <ModalHeader>Link Asset</ModalHeader>
        <BaseModalBody>
          <div className="flex flex-col gap-3">
            {tenantLocked ? (
              <BaseInput
                label="Tenant"
                value={tenantOptions[0]?.name ?? ''}
                isReadOnly
              />
            ) : (
              <ScopeSelect
                label="Tenant"
                options={tenantOptions}
                value={tenantId}
                onChange={setTenantId}
                placeholder="Choose a tenant"
              />
            )}
            {orgLocked ? (
              <BaseInput
                label="Organisation"
                value={
                  orgsForTenant[0]?.name ??
                  (canUseWholeTenant ? 'All organisations' : '')
                }
                isReadOnly
              />
            ) : (
              <ScopeSelect
                label="Organisation"
                options={orgsForTenant}
                value={organisationId}
                onChange={setOrganisationId}
                placeholder={
                  canUseWholeTenant
                    ? 'All organisations'
                    : 'Choose an organisation'
                }
                isDisabled={!tenantId}
              />
            )}
            <BaseAutocomplete
              label="Asset"
              isRequired
              placeholder="Search by name, number or registration"
              isDisabled={!scopeReady}
              selectedKey={selected?.id ?? null}
              onSelectionChange={key => {
                if (typeof key !== 'string' || key.startsWith('__')) return;
                setSelected(assets.find(a => a.id === key) ?? null);
              }}
              onValueChange={setAssetQuery}
              onOpenChange={open => {
                if (!open) setAssetQuery('');
              }}
              isLoading={assetsLoading}
              renderSelectedItem={() => (
                <span className="truncate text-xs font-medium">
                  {selected ? assetLabel(selected) : ''}
                </span>
              )}
            >
              {status
                ? [
                    <BaseAutocompleteItem
                      key="__status__"
                      id="__status__"
                      textValue={status}
                      isDisabled
                    >
                      {status}
                    </BaseAutocompleteItem>,
                  ]
                : [
                    ...choices.map(a => (
                      <BaseAutocompleteItem
                        key={a.id}
                        id={a.id}
                        textValue={assetLabel(a)}
                      >
                        <div className="flex w-full min-w-0 flex-1 items-center justify-between gap-3">
                          <div className="flex min-w-0 flex-col">
                            <span className="text-xs font-medium">
                              {a.assetName || 'Unnamed asset'}
                            </span>
                            {(a.assetId || a.registrationNo) && (
                              <span className="text-light-gray text-[11px]">
                                {[
                                  a.assetId ? `#${a.assetId}` : null,
                                  a.registrationNo,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            )}
                          </div>
                          <TrackingBadge
                            inTracking={
                              trackedIds ? trackedIds.has(a.id) : undefined
                            }
                            isLoading={trackingLoading}
                            isError={trackingError}
                          />
                        </div>
                      </BaseAutocompleteItem>
                    )),
                    ...moreRow,
                  ]}
            </BaseAutocomplete>
          </div>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton
            variant="bordered"
            onPress={handleClose}
            isDisabled={isLoading}
          >
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={() => selected && onConfirm(selected.id, selected)}
            isDisabled={!selected || isLoading}
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
  /** The ticket's scope: where the picker starts and where names are looked up. */
  tenantId?: string | null;
  organisationId?: string | null;
}

export const LinkedAssetsSection: FC<LinkedAssetsSectionProps> = ({
  ticketId,
  tenantId,
  organisationId,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { data: assets, isLoading } = useLinkedAssets(ticketId);
  const linkAssetMutation = useLinkAsset();
  const unlinkAssetMutation = useUnlinkAsset();

  const linkedIds = useMemo(
    () => (assets ?? []).map(a => a.assetId).filter((id): id is string => !!id),
    [assets],
  );
  const linkedIdSet = useMemo(() => new Set(linkedIds), [linkedIds]);
  // Names for what is already linked. The link itself only stores an id.
  const byId = useAssetsByIds(linkedIds, tenantId);
  // Looked up across the ticket's whole tenant, like the names above.
  const {
    trackedIds: trackedLinkedIds,
    isLoading: linkedTrackingLoading,
    isError: linkedTrackingError,
  } = useTrackedAssetIds({ tenantId }, { enabled: linkedIds.length > 0 });

  const nameOf = (id: string): string => {
    const asset = byId[id];
    if (asset === undefined) return 'Loading...';
    // null: asset-backend no longer knows this id, or it sits outside the
    // ticket's tenant. Say so rather than show a bare id as if it were a name.
    if (asset === null) return `Unknown asset (${id.substring(0, 8)})`;
    return assetLabel(asset);
  };

  const handleAdd = (assetId: string, asset: Asset) => {
    linkAssetMutation.mutate(
      { ticketId, assetId },
      {
        onSuccess: () => {
          toast('Asset linked', {
            description: `${assetLabel(asset)} linked to ticket.`,
            variant: 'success',
          });
          setIsAddModalOpen(false);
        },
        onError: () => {
          toast('Error', {
            description: 'Failed to link asset. Please try again.',
            variant: 'danger',
          });
        },
      },
    );
  };

  const handleUnlink = (assetId: string) => {
    unlinkAssetMutation.mutate(
      { ticketId, assetId },
      {
        onSuccess: () => {
          toast('Asset unlinked', {
            description: `${nameOf(assetId)} removed from ticket.`,
            variant: 'success',
          });
        },
        onError: () => {
          toast('Error', {
            description: 'Failed to unlink asset. Please try again.',
            variant: 'danger',
          });
        },
      },
    );
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-default-700">
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
        <p className="text-xs text-default-400">Loading assets...</p>
      ) : assets && assets.length > 0 ? (
        /*
          One row per asset rather than pills: a name with its number and
          registration beneath reads at a glance, where "Tow Truck (#11 ·
          273-TT)" squeezed into a pill did not. Unlink is a quiet button that
          only turns red on hover, so removing an asset is easy to find but
          hard to hit by accident.
        */
        <ul className="flex flex-col gap-1.5">
          {assets.map(link => {
            const asset = link.assetId ? byId[link.assetId] : null;
            const name =
              asset === undefined
                ? 'Loading...'
                : asset
                  ? asset.assetName?.trim() || 'Unnamed asset'
                  : 'Unknown asset';
            const detail = asset
              ? [
                  asset.assetId ? `#${asset.assetId}` : null,
                  asset.registrationNo,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : asset === null && link.assetId
                ? `No longer found (${link.assetId.substring(0, 8)})`
                : '';
            return (
              <li
                key={link.id}
                className="group flex items-center gap-2.5 rounded-md border border-default-200 px-2.5 py-2 transition-colors hover:bg-default-50"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-lighter-blue text-blue">
                  <Icon name="TruckIcon" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-default-700">
                    {name}
                  </p>
                  {detail && (
                    <p className="truncate text-xs text-default-400">
                      {detail}
                    </p>
                  )}
                </div>
                <TrackingBadge
                  inTracking={
                    link.assetId && trackedLinkedIds
                      ? trackedLinkedIds.has(link.assetId)
                      : undefined
                  }
                  isLoading={linkedTrackingLoading}
                  isError={linkedTrackingError}
                />
                <button
                  type="button"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-default-400 transition-colors hover:bg-danger-50 hover:text-danger-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => link.assetId && handleUnlink(link.assetId)}
                  aria-label={`Unlink ${name}`}
                  title="Unlink asset"
                >
                  <Icon name="XMarkIcon" className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-default-400 italic">No assets linked</p>
      )}

      <AddAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onConfirm={handleAdd}
        isLoading={linkAssetMutation.isPending}
        ticketTenantId={tenantId}
        ticketOrganisationId={organisationId}
        linkedIds={linkedIdSet}
      />
    </div>
  );
};
