import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';

interface EntityMovedScreenProps {
  /** Singular display label, e.g. "Article", "Approval workflow" -- renders as "{entityLabel} moved". */
  entityLabel: string;
  /** Resolved destination org/division name, or `null` when it couldn't be resolved. */
  destinationName: string | null;
  backHref: string;
  backLabel: string;
}

/**
 * The "record moved out of your context" screen a detail page swaps in
 * instead of a bare "not found" when a post-scope-save refetch 404s (see
 * `useEntityScopeStrip`'s `onGone`). Ported 1:1 from asset-mf's
 * `EntityMovedScreen` (DTO tenancy/scope metadata initiative).
 */
export function EntityMovedScreen({
  entityLabel,
  destinationName,
  backHref,
  backLabel,
}: EntityMovedScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Icon name="check-o" className="h-12 w-12 text-success-500 mb-4" />
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {entityLabel} moved
      </h2>
      <p className="text-muted-foreground mb-4 max-w-md text-center">
        {destinationName
          ? `Saved successfully — this ${entityLabel.toLowerCase()} now belongs to ${destinationName}. It still exists, it's just outside the scope you're currently viewing, so it won't appear here.`
          : `Saved successfully — this ${entityLabel.toLowerCase()} is now outside the scope you're currently viewing, so it won't appear here. It still exists.`}
      </p>
      <BaseButton href={backHref} variant="light">
        {backLabel}
      </BaseButton>
    </div>
  );
}
