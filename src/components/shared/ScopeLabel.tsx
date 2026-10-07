import { useScopeNames } from '@/hooks/useScopeNames';
import type { FC } from 'react';

interface ScopeMetaLike {
  accessLevel?: string | null;
  tenantId?: string | null;
  organisationId?: string | null;
  divisionId?: string | null;
}

/**
 * Where a Configuration record lives, as text: its level and the place's
 * name, for example "Tenant · Netcorp" or "Organisation · Remondis ACT".
 *
 * These tables used `ScopeBadge`, which the platform has retired from table
 * columns in favour of the coloured row border, and which renders nothing for
 * a record in the viewer's own scope. The column was therefore blank on nearly
 * every row. This always says where the record belongs.
 */
export const ScopeLabel: FC<{ meta?: ScopeMetaLike | null }> = ({ meta }) => {
  const { byTenantId, byOrganisationId, divisionOptions } = useScopeNames();
  const level = meta?.accessLevel;
  if (!level) return <span className="text-light-gray text-sm">—</span>;
  const place =
    level === 'Division'
      ? divisionOptions.find(d => d.id === meta?.divisionId)?.name
      : level === 'Organisation'
        ? byOrganisationId.get(meta?.organisationId ?? '')
        : level === 'Tenant'
          ? byTenantId.get(meta?.tenantId ?? '')?.tenantName
          : undefined;
  return (
    <span className="text-default-600 text-sm">
      {level}
      {place ? ` · ${place}` : ''}
    </span>
  );
};
