/**
 * One organisation's deadlines:
 * /configuration/company-deadlines/[tenantId]/organisations/[organisationId]
 *
 * An organisation uses its tenant's deadlines (which may be the default)
 * unless it has its own. Inheriting, they are shown read-only, "From
 * Remondis" or "From default", with "Set own deadlines"; with its own, what
 * differs from the tenant's is marked, with "Use Remondis's deadlines".
 * DeadlinePolicyPage does all of it, as for a tenant. Netcorp staff only.
 */
import { policyKey } from '@/api/local/company-deadlines';
import { AppLoadingSplash } from '@/components/AppSplash';
import { TicketCountsLine } from '@/components/company-deadlines/components/DeadlineCells';
import { DeadlinePolicyPage } from '@/components/company-deadlines/components/DeadlinePolicyPage';
import { DeadlinesAccessDenied } from '@/components/company-deadlines/components/DeadlinesAccessDenied';
import {
  useCompanyDeadlinePolicy,
  useDeadlinesPrincipal,
} from '@/components/company-deadlines/hooks/useCompanyDeadlines';
import { sourceName } from '@/components/company-deadlines/resolveDeadlines';
import { useScopeNames } from '@/hooks/useScopeNames';
import { useParams } from '@modern-js/runtime/router';

function OrganisationDeadlinePage() {
  const { tenantId = '', organisationId = '' } = useParams<{
    tenantId: string;
    organisationId: string;
  }>();
  const key = policyKey(tenantId, organisationId);

  const {
    principalId,
    isAdmin,
    isLoading: loadingAccess,
  } = useDeadlinesPrincipal();
  const enabledPrincipal = isAdmin ? principalId : undefined;
  const { data: policy, isLoading } = useCompanyDeadlinePolicy(
    enabledPrincipal,
    key,
  );
  // The tenant's effective deadlines: what its own differ from, and what
  // it goes back to. Usually cached, since people arrive from that page.
  const tenantPolicy = useCompanyDeadlinePolicy(enabledPrincipal, tenantId);
  const compare = Boolean(policy?.isCustom);

  const { byTenantId, byOrganisationId } = useScopeNames();
  const tenantName = byTenantId.get(tenantId)?.tenantName ?? 'Tenant';
  const name = byOrganisationId.get(organisationId) ?? 'Organisation';

  if (!loadingAccess && !isAdmin) return <DeadlinesAccessDenied />;
  if (loadingAccess || isLoading || !policy || tenantPolicy.isLoading)
    return <AppLoadingSplash />;

  // Inheriting: wherever its values come from. Its own: the tenant's,
  // which are the default's when the tenant has none.
  const inheritedName = compare
    ? tenantPolicy.data?.isCustom
      ? tenantName
      : 'default'
    : sourceName(policy.source, { tenant: tenantName });

  return (
    <DeadlinePolicyPage
      key={key}
      principalId={principalId}
      policyKey={key}
      policy={policy}
      title={`${tenantName} · ${name}`}
      name={name}
      breadcrumbsKey="configuration.company-deadlines.organisation"
      breadcrumbsParams={{ tenantId, companyName: tenantName, name }}
      tenantId={tenantId}
      organisationId={organisationId}
      inherited={{ name: inheritedName, policy: tenantPolicy.data }}
      intro={
        <TicketCountsLine
          kind="Organisation"
          open={policy.openTickets}
          late={policy.lateTickets}
          tenantId={tenantId}
          organisationId={organisationId}
        />
      }
    />
  );
}

export default OrganisationDeadlinePage;
