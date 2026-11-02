import { useTenantNames } from '@/hooks/useTenantNames';
import type { FC } from 'react';
import { handledByBadgeLabel } from '../new-request/request-categories';

interface Props {
  /** The handling office's level above the tenant; 0 or absent renders nothing. */
  level: number | null | undefined;
  /** The handling tenant's name, once identity has resolved it. */
  tenantName?: string;
}

/**
 * "Handled by" on a ticket a helpdesk above the tenant works: the provider's
 * name (or "Provider") one level up, "Netcorp" two levels up. The tenant's own
 * tickets carry no badge.
 */
export const HandledByBadge: FC<Props> = ({ level, tenantName }) => {
  const label = handledByBadgeLabel(level, tenantName);
  if (!label) return null;
  return (
    <span
      data-testid="handled-by-badge"
      title={`Handled by ${label}`}
      className="bg-lighter-blue text-blue inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-medium"
    >
      {label}
    </span>
  );
};

/** The same badge for a list row, which carries only the handling tenant's id. */
export const HandledByTenantBadge: FC<{
  level: number | null | undefined;
  tenantId: string | null | undefined;
}> = ({ level, tenantId }) => {
  const names = useTenantNames([(level ?? 0) > 0 ? tenantId : null]);
  return (
    <HandledByBadge
      level={level}
      tenantName={tenantId ? names[tenantId] : undefined}
    />
  );
};
