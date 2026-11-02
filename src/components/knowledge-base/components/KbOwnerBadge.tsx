import { useTenantNames } from '@/hooks/useTenantNames';
import { Chip } from '@heroui/react';
import type { FC } from 'react';
import { ownerBadgeLabel } from '../sharing';

/**
 * "From Netcorp" on an article an office above this tenant shares with it.
 * Nothing on the tenant's own articles. The owner's name comes from
 * identity-management; the helpdesk sends only the id.
 */
export const KbOwnerBadge: FC<{
  article: { isInherited?: boolean; ownerTenantId?: string };
}> = ({ article }) => {
  const names = useTenantNames(
    article.isInherited ? [article.ownerTenantId] : [],
  );
  const label = ownerBadgeLabel(article, names);
  if (!label) return null;
  return (
    <Chip size="sm" variant="soft" color="accent" data-testid="kb-owner-badge">
      {label}
    </Chip>
  );
};
