/**
 * One tenant's deadlines: /configuration/company-deadlines/[tenantId]
 *
 * Also the default policy, at /configuration/company-deadlines/default,
 * which every tenant without its own uses. A tenant's page lists its
 * organisations below, a page at a time; each can have deadlines of its own
 * (organisations/[organisationId]/page.tsx). Netcorp staff only.
 *
 * DeadlinePolicyPage reads, edits and saves all of them the same way, and
 * nothing here calculates a deadline: the worked example asks the backend.
 */
import { DEFAULT_POLICY_KEY } from '@/api/local/company-deadlines';
import { AppLoadingSplash } from '@/components/AppSplash';
import { TicketCountsLine } from '@/components/company-deadlines/components/DeadlineCells';
import { DeadlinePolicyPage } from '@/components/company-deadlines/components/DeadlinePolicyPage';
import { DeadlinesAccessDenied } from '@/components/company-deadlines/components/DeadlinesAccessDenied';
import { OrganisationDeadlinesSection } from '@/components/company-deadlines/components/OrganisationDeadlinesSection';
import {
  useCompanyDeadlinePolicy,
  useDeadlinesPrincipal,
} from '@/components/company-deadlines/hooks/useCompanyDeadlines';
import { useScopeNames } from '@/hooks/useScopeNames';
import { useParams } from '@modern-js/runtime/router';

function CompanyDeadlinePage() {
  const { tenantId: key = '' } = useParams<{ tenantId: string }>();
  const isDefault = key === DEFAULT_POLICY_KEY;
  const tenantId = isDefault ? null : key;

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
  // What its own deadlines differ from; the list has already loaded it.
  const defaults = useCompanyDeadlinePolicy(
    isDefault ? undefined : enabledPrincipal,
    DEFAULT_POLICY_KEY,
  );

  const { byTenantId } = useScopeNames();
  const name = isDefault
    ? 'Default'
    : (byTenantId.get(key)?.tenantName ?? 'Tenant');

  if (!loadingAccess && !isAdmin) return <DeadlinesAccessDenied />;
  if (loadingAccess || isLoading || !policy || defaults.isLoading)
    return <AppLoadingSplash />;

  return (
    <DeadlinePolicyPage
      // A new page, never the last one's mode or draft.
      key={key}
      principalId={principalId}
      policyKey={key}
      policy={policy}
      title={isDefault ? 'Default deadlines' : name}
      name={name}
      breadcrumbsKey="configuration.company-deadlines.detail"
      breadcrumbsParams={{ name: isDefault ? 'Default' : name }}
      tenantId={tenantId}
      inherited={isDefault ? null : { name: 'default', policy: defaults.data }}
      intro={
        tenantId ? (
          <TicketCountsLine
            kind="Tenant"
            open={policy.openTickets}
            late={policy.lateTickets}
            tenantId={tenantId}
          />
        ) : (
          <p className="text-default-600 -mt-2 mb-4 text-sm">
            Used by every tenant that has no deadlines of its own.
          </p>
        )
      }
    >
      {tenantId && (
        <OrganisationDeadlinesSection
          principalId={enabledPrincipal}
          tenantId={tenantId}
          tenantName={name}
        />
      )}
    </DeadlinePolicyPage>
  );
}

export default CompanyDeadlinePage;
