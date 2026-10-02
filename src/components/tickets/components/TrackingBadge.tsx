import type { FC } from 'react';

interface TrackingBadgeProps {
  /** undefined until Tracking has answered. */
  inTracking: boolean | undefined;
  isLoading?: boolean;
  isError?: boolean;
}

/**
 * Whether an asset exists in Tracking: Tracking holds a trackable connected to
 * it. Not whether it is reporting right now. Assets reach Tracking through the
 * Asset app, so "Not in Tracking" means it has not been connected there.
 *
 * Always says something. It used to render nothing until Tracking answered and
 * nothing at all if the lookup failed, so the label simply vanished with no
 * hint why. Loading and failure now have their own wording.
 */
export const TrackingBadge: FC<TrackingBadgeProps> = ({
  inTracking,
  isLoading,
  isError,
}) => {
  const [label, tone] =
    inTracking === true
      ? ['In Tracking', 'bg-green/10 text-green']
      : inTracking === false
        ? ['Not in Tracking', 'bg-light text-gray']
        : isError
          ? ['Tracking unavailable', 'bg-light text-light-gray']
          : isLoading
            ? ['Checking…', 'bg-light text-light-gray']
            : [null, ''];
  if (!label) return null;
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}
      title={
        isError && inTracking === undefined
          ? "Couldn't reach Tracking to check this asset"
          : undefined
      }
    >
      {label}
    </span>
  );
};
