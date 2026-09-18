import type { UseScopeNamesResult } from '@/hooks/useScopeNames';

interface ScopeCellProps {
  tenantId?: string | null;
  organisationId?: string | null;
  /** Resolved names, from a single `useScopeNames()` call in the grid. */
  names: UseScopeNamesResult;
}

/**
 * Where a ticket sits: tenant above, organisation below, in one column.
 *
 * Both are stacked rather than given a column each because they are one fact,
 * read together, and two columns would spend twice the width to say it.
 *
 * Both lines are mandatory on a ticket (the tenant is a shell, the organisation
 * is the real placement inside it), so a missing one is a data fault, not an
 * empty state. It is spelled out in red rather than left blank: a blank cell
 * reads as "nothing to show here", which is the opposite of the truth.
 *
 * A name that will not resolve falls back to the truncated id. That happens
 * when a ticket belongs to a context outside the viewer's own access list,
 * since /v1/contexts/available only returns what they can reach, and a partial
 * id is more honest than showing nothing.
 */
export const ScopeCell: React.FC<ScopeCellProps> = ({
  tenantId,
  organisationId,
  names,
}) => {
  const tenantName = tenantId
    ? (names.byTenantId.get(tenantId)?.tenantName ??
      `${tenantId.substring(0, 8)}...`)
    : 'No tenant';
  const orgName = organisationId
    ? (names.byOrganisationId.get(organisationId) ??
      `${organisationId.substring(0, 8)}...`)
    : 'No organisation';

  return (
    <div className="flex min-w-0 flex-col leading-tight">
      <span
        className={`truncate text-sm ${tenantId ? '' : 'text-red-dark'}`}
        title={tenantName}
      >
        {tenantName}
      </span>
      <span
        className={`truncate text-xs ${
          organisationId ? 'text-muted-foreground' : 'text-red-dark'
        }`}
        title={orgName}
      >
        {orgName}
      </span>
    </div>
  );
};
