import { useScopeNames } from '@/hooks/useScopeNames';
import type { FC } from 'react';

/** Company (tenant) and organisation names for a ticket, resolved once from contexts. */
export const useTicketScopeNames = (
  tenantId?: string | null,
  organisationId?: string | null,
) => {
  const names = useScopeNames();
  return {
    companyName: tenantId
      ? (names.byTenantId.get(tenantId)?.tenantName ?? null)
      : null,
    organisationName: organisationId
      ? (names.byOrganisationId.get(organisationId) ?? null)
      : null,
  };
};

export const CompanyPill: FC<{ name: string }> = ({ name }) => (
  <span
    className="inline-flex h-5 max-w-full items-center truncate rounded-[2px] bg-[#dbeafe] px-2 text-xs font-medium text-[#1d4ed8]"
    title={`Company: ${name}`}
  >
    {name}
  </span>
);

export const OrganisationPill: FC<{ name: string }> = ({ name }) => (
  <span
    className="inline-flex h-5 max-w-full items-center truncate rounded-[2px] bg-[#dcfce7] px-2 text-xs font-medium text-[#15803d]"
    title={`Organisation: ${name}`}
  >
    {name}
  </span>
);
