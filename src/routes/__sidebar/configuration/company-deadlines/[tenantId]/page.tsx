/**
 * One company's deadlines: /configuration/company-deadlines/[tenantId]
 *
 * Also the default policy, at /configuration/company-deadlines/default, which
 * every company without its own follows. Netcorp staff only. An organisation
 * of the company can have its own deadlines instead
 * (organisations/[organisationId]/page.tsx); the form is the same component.
 *
 * The worked example asks the backend, with the unsaved form, what a ticket
 * would get. Nothing on this page calculates a deadline.
 */
import { DEFAULT_POLICY_KEY, policyKey } from '@/api/local/company-deadlines';
import { AppLoadingSplash } from '@/components/AppSplash';
import { DeadlinePolicyForm } from '@/components/company-deadlines/components/DeadlinePolicyForm';
import {
  useCompanyDeadlinePolicy,
  useDeadlinesPrincipal,
  useRevertCompanyDeadlinePolicy,
} from '@/components/company-deadlines/hooks/useCompanyDeadlines';
import { useScopeNames } from '@/hooks/useScopeNames';
import { AccessDenied } from '@/security';
import { extractErrorMessage } from '@/utils/error-handling';
import { BaseButton } from '@brainforgeau/components/button';
import { useConfirm } from '@brainforgeau/components/page';
import { toast } from '@heroui/react';
import { NavLink, useNavigate, useParams } from '@modern-js/runtime/router';
import { Fragment, useMemo } from 'react';

const pill = 'rounded-[2px] px-1.5 py-0.5 text-xs font-medium';

function CompanyDeadlinePage() {
  const navigate = useNavigate();
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
  const revert = useRevertCompanyDeadlinePolicy(enabledPrincipal);
  const { confirm, dialog } = useConfirm();

  const { byTenantId, organisationOptions, byOrganisationId } = useScopeNames();
  const name = isDefault
    ? 'Default for all tenants'
    : (byTenantId.get(key)?.tenantName ?? 'Tenant');
  // The organisation pill is left out when it only repeats the company name.
  const organisations = useMemo(
    () =>
      isDefault
        ? []
        : organisationOptions.filter(
            o => o.parentId === key && o.name !== name,
          ),
    [isDefault, organisationOptions, key, name],
  );
  // Organisations with deadlines of their own, which this page does not set.
  const customOrganisations = useMemo(
    () =>
      (policy?.customOrganisationIds ?? []).map(id => ({
        id,
        name: byOrganisationId.get(id) ?? 'Organisation',
      })),
    [policy?.customOrganisationIds, byOrganisationId],
  );

  const handleUseDefault = async () => {
    if (!tenantId) return;
    const ok = await confirm({
      title: 'Use the default deadlines?',
      body: `${name} will use the default deadlines. Open tickets keep their current due dates.`,
      confirmLabel: 'Use default deadlines',
    });
    if (!ok) return;
    const done = () => {
      toast(`${name} now uses the default deadlines`, { variant: 'success' });
      navigate('/configuration/company-deadlines');
    };
    revert.mutate(policyKey(tenantId), {
      onSuccess: done,
      onError: error => {
        // 404: the company had no policy of its own, so it is already on the default.
        if (
          (error as { response?: { status?: number } }).response?.status === 404
        ) {
          done();
          return;
        }
        toast("Couldn't switch to the default deadlines", {
          description: extractErrorMessage(error, 'Try again.'),
          variant: 'danger',
        });
      },
    });
  };

  if (!loadingAccess && !isAdmin) {
    return (
      <div className="flex min-h-[60vh] w-full flex-1 items-center justify-center p-6">
        <AccessDenied
          title="You don't have access to this page"
          message="Tenant deadlines are set by Netcorp's helpdesk admins."
        />
      </div>
    );
  }
  if (loadingAccess || isLoading || !policy) return <AppLoadingSplash />;

  const applyCount = policy.inheritingOpenTickets;

  return (
    <DeadlinePolicyForm
      principalId={principalId}
      policyKey={key}
      policy={policy}
      name={name}
      breadcrumbsKey="configuration.company-deadlines.detail"
      breadcrumbsParams={{ name }}
      tenantId={tenantId}
      applyQuestion={
        isDefault
          ? `Apply to the ${applyCount} open tickets too?`
          : `Apply to ${applyCount} open tickets in organisations using these deadlines?`
      }
      onCancel={() => navigate('/configuration/company-deadlines')}
      headerActions={
        policy.isCustom &&
        !isDefault && (
          <BaseButton
            variant="bordered"
            onPress={handleUseDefault}
            isDisabled={revert.isPending}
          >
            Use default deadlines
          </BaseButton>
        )
      }
    >
      {dialog}
      <div className="text-default-600 -mt-2 mb-6 flex flex-wrap items-center gap-2 text-sm">
        {isDefault ? (
          <span>Used by every tenant that has no deadlines of its own.</span>
        ) : (
          <>
            <span className={`bg-lighter-blue text-blue ${pill}`}>Tenant</span>
            {organisations.length > 0 && (
              <>
                <span>
                  {organisations.length} organisation
                  {organisations.length === 1 ? '' : 's'}:
                </span>
                {organisations.map(o => (
                  <span
                    key={o.id}
                    className={`bg-green-100 text-green-800 ${pill}`}
                  >
                    {o.name}
                  </span>
                ))}
              </>
            )}
            <span>
              {policy.openTickets} open tickets, {policy.lateTickets} late.
              Deadlines apply to every organisation in this tenant that has none
              of its own.
              {!policy.isCustom && ' It follows the default until you save.'}
            </span>
          </>
        )}
      </div>
      {customOrganisations.length > 0 && tenantId && (
        <p className="text-default-600 -mt-3 mb-6 text-sm">
          {customOrganisations.map((o, i) => (
            <Fragment key={o.id}>
              {i > 0 && (i === customOrganisations.length - 1 ? ' and ' : ', ')}
              <NavLink
                to={`/configuration/company-deadlines/${policyKey(tenantId, o.id)}`}
                className="text-primary font-medium hover:underline"
              >
                {o.name}
              </NavLink>
            </Fragment>
          ))}{' '}
          {customOrganisations.length === 1 ? 'has' : 'have'} deadlines of
          {customOrganisations.length === 1 ? ' its' : ' their'} own, which
          these do not change.
        </p>
      )}
    </DeadlinePolicyForm>
  );
}

export default CompanyDeadlinePage;
