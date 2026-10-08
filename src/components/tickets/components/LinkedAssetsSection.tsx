import { IconTip, ModalHeader, ScopeSelect } from '@/components/shared';
import { useScopeNames } from '@/hooks/useScopeNames';
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

import { HelpdeskPermissions } from '@/constants/permissions';
import { usePermissions } from '@brainforgeau/security';
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
  // Linking and unlinking need tickets.update, as their endpoints do. Without
  // it the list is still shown, read only.
  const { hasPermission } = usePermissions();
  const canEditLinks = hasPermission(HelpdeskPermissions.Tickets.Update);
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

  const trackingNote = (assetId?: string | null) =>
    linkedTrackingError || !assetId || !trackedLinkedIds
      ? ''
      : trackedLinkedIds.has(assetId)
        ? 'In Tracking'
        : 'Not in Tracking';

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-default-700">
        Vehicles
      </span>

      {isLoading ? (
        <p className="text-xs text-default-400">Loading vehicles...</p>
      ) : assets && assets.length > 0 ? (
        /*
          Soft chips in the picker's own format, "Name (#id · REGO)", so a
          vehicle reads the same here as where it was chosen. Whether it is in
          Tracking is on hover, not a second badge per row.
        */
        <ul className="flex flex-wrap gap-1.5">
          {assets.map(link => {
            const asset = link.assetId ? byId[link.assetId] : null;
            const label =
              asset === undefined
                ? 'Loading...'
                : asset
                  ? assetLabel(asset)
                  : `Unknown vehicle (${link.assetId?.substring(0, 8) ?? ''})`;
            const tracking = linkedTrackingLoading
              ? ''
              : trackingNote(link.assetId);
            return (
              <li
                key={link.id}
                title={tracking ? `${label}. ${tracking}` : label}
                className="inline-flex h-6 max-w-full items-center gap-1 rounded-[3px] bg-[#dbeafe] pr-1 pl-2 text-xs text-[#1d4ed8]"
              >
                <span className="truncate">{label}</span>
                {canEditLinks && (
                  <IconTip label={`Unlink ${label}`}>
                    <button
                      type="button"
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] hover:bg-[#bfdbfe] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => link.assetId && handleUnlink(link.assetId)}
                      aria-label={`Unlink ${label}`}
                    >
                      <Icon name="x" className="h-3 w-3" />
                    </button>
                  </IconTip>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-default-400 italic">No vehicles linked</p>
      )}

      {canEditLinks && (
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="mt-1.5 text-xs text-blue hover:underline"
        >
          + Link vehicle
        </button>
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
