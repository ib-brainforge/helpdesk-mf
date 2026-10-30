import { useScopeNames } from '@/hooks/useScopeNames';
import type { FC } from 'react';

/** Tenant and organisation names for a ticket, resolved once from contexts. */
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
    title={`Tenant: ${name}`}
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

/**
 * A ticket's place, always tenant first then organisation: "Remondis ·
 * Remondis NSW". A tenant is the account; its organisations work
 * separately, so the two are never merged into one name. The organisation is
 * left out only when it is missing or carries exactly the tenant's name.
 */
export const scopePath = (
  tenantName?: string | null,
  organisationName?: string | null,
) =>
  [
    tenantName,
    organisationName && organisationName !== tenantName
      ? organisationName
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * The same "Tenant · Organisation" everywhere a ticket shows both: as the two
 * coloured pills (ticket page) or as one line of text (the list).
 */
export const ScopePath: FC<{
  tenantName?: string | null;
  organisationName?: string | null;
  variant?: 'pills' | 'text';
}> = ({ tenantName, organisationName, variant = 'pills' }) => {
  const org =
    organisationName && organisationName !== tenantName
      ? organisationName
      : null;
  if (!tenantName && !org) return null;
  const title = [
    tenantName ? `Tenant: ${tenantName}` : null,
    org ? `Organisation: ${org}` : null,
  ]
    .filter(Boolean)
    .join(', ');
  if (variant === 'text') {
    return (
      <span className="block min-w-0 truncate text-xs leading-4" title={title}>
        {tenantName && (
          <span className="font-medium text-foreground">{tenantName}</span>
        )}
        {tenantName && org && <span className="text-[#8c8f97]"> · </span>}
        {org && <span className="text-[#8c8f97]">{org}</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1">
      {tenantName && <CompanyPill name={tenantName} />}
      {tenantName && org && (
        <span aria-hidden className="text-xs text-default-500">
          ·
        </span>
      )}
      {org && <OrganisationPill name={org} />}
    </span>
  );
};
