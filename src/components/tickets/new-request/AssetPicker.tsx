import { selectedContextAtom } from '@/state/auth-atoms';
import {
  BaseAutocomplete,
  BaseAutocompleteItem,
  BaseChip,
} from '@brainforgeau/components';
import { useAtomValue } from 'jotai';
import { type FC, useMemo, useState } from 'react';
import { TrackingBadge } from '../components/TrackingBadge';
import {
  type Asset,
  assetLabel,
  useAssetSearch,
  useTrackedAssetIds,
} from '../hooks/useAssets';
import { useRequestScope } from './requestScope';

/** A vehicle the requester has chosen. */
export interface PickedAsset {
  /** asset-backend's id: what the ticket's linked assets hold. */
  assetId: string;
  /** As it reads in the ticket: name, then asset number and registration. */
  label: string;
}

export const toPickedAsset = (a: Asset): PickedAsset => ({
  assetId: a.id,
  label: assetLabel(a),
});

interface Props {
  label: string;
  placeholder?: string;
  value: PickedAsset[];
  onChange: (value: PickedAsset[]) => void;
  showError?: boolean;
}

/**
 * Search the requester's vehicles and pick one or more.
 *
 * From the Asset app, the same source as a ticket's linked assets, so every
 * vehicle picked here can be linked to the ticket once it exists. The search
 * covers the tenant and organisation chosen for the request, which is where the
 * ticket itself is created.
 *
 * A search box rather than a fixed dropdown: a fleet runs to hundreds of
 * vehicles (443 for Remondis), and asset-backend searches and pages them, so
 * only what the current search matches is ever loaded. Each pick is added as a
 * chip beneath the box, which clears so the next one can be searched. Already
 * chosen vehicles are left out of the results so none is added twice.
 */
export const AssetPicker: FC<Props> = ({
  label,
  placeholder,
  value,
  onChange,
  showError,
}) => {
  // The tenant and organisation chosen on the wizard's Details step, else the
  // app's own context.
  const requestScope = useRequestScope();
  const appContext = useAtomValue(selectedContextAtom);
  const context = requestScope ?? appContext;
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  // Nothing is fetched until the picker is first opened.
  const [hasOpened, setHasOpened] = useState(false);
  const { assets, totalCount, isLoading, isError } = useAssetSearch(
    query,
    {
      tenantId: context?.tenantId,
      organisationId: context?.organisationId,
    },
    { enabled: hasOpened },
  );

  // Which of the requester's assets exist in Tracking, read once per context.
  const {
    trackedIds,
    isLoading: trackingLoading,
    isError: trackingError,
  } = useTrackedAssetIds(
    {
      tenantId: context?.tenantId,
      organisationId: context?.organisationId,
    },
    { enabled: hasOpened },
  );

  const pickedIds = useMemo(() => new Set(value.map(v => v.assetId)), [value]);
  const choices = assets.filter(a => !pickedIds.has(a.id));

  const add = (id: string) => {
    const a = assets.find(x => x.id === id);
    if (!a || pickedIds.has(a.id)) return;
    onChange([...value, toPickedAsset(a)]);
    setQuery('');
  };

  // A row the list shows when there is nothing to pick, so an empty popover
  // says why instead of looking broken.
  const status = isError
    ? "Couldn't load your vehicles"
    : isLoading && choices.length === 0
      ? 'Loading vehicles...'
      : choices.length === 0
        ? query.trim()
          ? `No vehicles match "${query.trim()}"`
          : 'No vehicles in this organisation'
        : null;

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
    <div>
      <BaseAutocomplete
        label={label}
        isRequired
        placeholder={placeholder}
        selectedKey={null}
        onSelectionChange={key => {
          if (typeof key === 'string' && !key.startsWith('__')) add(key);
        }}
        onValueChange={setQuery}
        onOpenChange={open => {
          setIsOpen(open);
          if (open) setHasOpened(true);
          else setQuery('');
        }}
        isLoading={isOpen && isLoading}
        isInvalid={showError}
        errorMessage={showError ? 'Choose at least one vehicle' : undefined}
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
                      inTracking={trackedIds ? trackedIds.has(a.id) : undefined}
                      isLoading={trackingLoading}
                      isError={trackingError}
                    />
                  </div>
                </BaseAutocompleteItem>
              )),
              ...moreRow,
            ]}
      </BaseAutocomplete>

      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map(v => (
            <BaseChip
              key={v.assetId}
              size="sm"
              variant="soft"
              color="primary"
              onClose={() =>
                onChange(value.filter(x => x.assetId !== v.assetId))
              }
            >
              {v.label}
            </BaseChip>
          ))}
        </div>
      )}
    </div>
  );
};
