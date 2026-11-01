import type {
  HelpdeskApplicationCategoriesModelsAvailableCategoryDto as AvailableCategory,
  HelpdeskApplicationCategoriesModelsCategoryHandledBy as CategoryHandledBy,
} from '@brainforgeau/helpdesk-client';
import { type RequestField, toRequestField } from './request-fields';

/**
 * The New Request wizard's categories, as the API lists them.
 *
 * A ticket is filed in the helpdesk of the tenant that owns its category: the
 * tenant's own for its own categories, the provider's office or the platform
 * owner's office for one shared down the chain. `GET v1/categories/available`
 * tags each category with `handledBy` and `level`; tenant names are not part
 * of it (they live in identity-management), so they are passed in here and
 * generic words stand in until they resolve.
 */

/** The platform owner's name, as the UI says it. */
export const PLATFORM_OWNER_NAME = 'Netcorp';

export type ChainCategory = Pick<
  AvailableCategory,
  'id' | 'name' | 'description' | 'ownerTenantId' | 'level' | 'handledBy'
>;

export interface CategoryGroup<T extends ChainCategory = ChainCategory> {
  handledBy: CategoryHandledBy;
  title: string;
  /** The tenant whose helpdesk works this group's tickets (unset for Local). */
  ownerTenantId?: string;
  categories: T[];
}

const GROUP_ORDER: CategoryHandledBy[] = ['Local', 'Provider', 'Platform'];

/** Who handles a category; derived from its level when `handledBy` is absent. */
export const handledByOf = (category: ChainCategory): CategoryHandledBy => {
  if (category.handledBy) return category.handledBy;
  const level = category.level ?? 0;
  if (level <= 0) return 'Local';
  return level === 1 ? 'Provider' : 'Platform';
};

export const groupTitle = (
  handledBy: CategoryHandledBy,
  ownerName: string | undefined,
): string => {
  switch (handledBy) {
    case 'Local':
      return 'Your helpdesk';
    case 'Provider':
      return ownerName ? `Your provider · ${ownerName}` : 'Your provider';
    default:
      return PLATFORM_OWNER_NAME;
  }
};

/**
 * The categories grouped by who handles them, in chain order: "Your helpdesk"
 * (absent when the tenant has no active categories of its own), then the
 * provider's, then the platform owner's. Empty groups are dropped; within a
 * group the server's order (sort order, name) is kept.
 */
export const groupCategories = <T extends ChainCategory>(
  categories: readonly T[],
  tenantNames: Readonly<Record<string, string>> = {},
): CategoryGroup<T>[] => {
  const byHandler = new Map<CategoryHandledBy, T[]>();
  for (const category of categories) {
    if (!category.id) continue;
    const key = handledByOf(category);
    const bucket = byHandler.get(key);
    if (bucket) bucket.push(category);
    else byHandler.set(key, [category]);
  }
  return GROUP_ORDER.flatMap(handledBy => {
    const bucket = byHandler.get(handledBy);
    if (!bucket?.length) return [];
    const ownerTenantId =
      handledBy === 'Local'
        ? undefined
        : bucket.find(c => c.ownerTenantId)?.ownerTenantId;
    return [
      {
        handledBy,
        title: groupTitle(
          handledBy,
          ownerTenantId ? tenantNames[ownerTenantId] : undefined,
        ),
        ownerTenantId,
        categories: bucket,
      },
    ];
  });
};

/**
 * Where a new ticket went, after `POST v1/tickets`: "your helpdesk" when the
 * handling tenant is the caller's own, else that tenant's name, falling back
 * to "your provider" or "Netcorp" by the chosen category's place in the chain.
 */
export const sentToLabel = ({
  handledByTenantId,
  ownTenantId,
  category,
  tenantNames = {},
}: {
  handledByTenantId: string;
  ownTenantId: string | null | undefined;
  category: ChainCategory | undefined;
  tenantNames?: Readonly<Record<string, string>>;
}): string => {
  if (ownTenantId && handledByTenantId === ownTenantId) {
    return 'Sent to your helpdesk';
  }
  const name = tenantNames[handledByTenantId];
  if (name) return `Sent to ${name}`;
  return category && handledByOf(category) === 'Platform'
    ? `Sent to ${PLATFORM_OWNER_NAME}`
    : 'Sent to your provider';
};

/**
 * Label of the Handled by badge on a ticket: none for the tenant's own
 * tickets, the handling tenant's name when known, else "Provider" one level
 * up and "Netcorp" two levels up.
 */
export const handledByBadgeLabel = (
  level: number | null | undefined,
  handlingTenantName?: string,
): string | null => {
  if (!level || level <= 0) return null;
  if (handlingTenantName) return handlingTenantName;
  return level === 1 ? 'Provider' : PLATFORM_OWNER_NAME;
};

/** How a category reads in the wizard: its card, and the copy over its questions. */
export interface CategoryCard {
  id: string;
  label: string;
  /** Heroicons name on the card. */
  icon: string;
  /** One line under the label: what this is for. */
  summary: string;
  /** Shown above the questions, for example a reminder to check something first. */
  note?: string;
  /** Heading over the questions. */
  heading?: string;
  /**
   * Handled without a visit (a portal, account or app question), so the
   * Details step does not insist on a phone number and a site location.
   */
  remote: boolean;
  /** The questions, in the order they are asked. */
  fields: RequestField[];
}

/** A category's card, from what the API lists with it. */
export const cardOf = (category: AvailableCategory): CategoryCard => ({
  id: category.id ?? '',
  label: category.name ?? 'Request',
  icon: category.icon || 'TicketIcon',
  summary: category.description ?? '',
  note: category.note ?? undefined,
  heading: category.questionsHeading ?? undefined,
  remote: !!category.isRemote,
  fields: (category.fields ?? []).flatMap(toRequestField),
});
