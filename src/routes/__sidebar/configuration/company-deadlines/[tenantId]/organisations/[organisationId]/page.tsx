/**
 * One organisation's deadlines:
 * /configuration/company-deadlines/[tenantId]/organisations/[organisationId]
 *
 * An organisation uses its company's deadlines (which may themselves be the
 * default) unless it has its own. The page opens on a choice between the two:
 * inheriting shows the company's values read-only, setting its own edits them
 * in the same form the company page uses. Going back to the company's calls
 * DELETE, behind the same confirm as the company's "Use default deadlines".
 * Netcorp staff only.
 */
import { policyKey } from '@/api/local/company-deadlines';
import { AppLoadingSplash } from '@/components/AppSplash';
import { DeadlinePolicyForm } from '@/components/company-deadlines/components/DeadlinePolicyForm';
import {
  useCompanyDeadlinePolicy,
  useDeadlinesPrincipal,
  useRevertCompanyDeadlinePolicy,
} from '@/components/company-deadlines/hooks/useCompanyDeadlines';
import { useScopeNames } from '@/hooks/useScopeNames';
import { extractErrorMessage } from '@/utils/error-handling';
import { useConfirm } from '@brainforgeau/components/page';
import { AccessDenied } from '@brainforgeau/security';
import { toast } from '@heroui/react';
import { NavLink, useNavigate, useParams } from '@modern-js/runtime/router';
import { useState } from 'react';

const pill = 'rounded-[2px] px-1.5 py-0.5 text-xs font-medium';

function OrganisationDeadlinePage() {
  const navigate = useNavigate();
  const { tenantId = '', organisationId = '' } = useParams<{
    tenantId: string;
    organisationId: string;
  }>();
  const key = policyKey(tenantId, organisationId);
  const companyPath = `/configuration/company-deadlines/${tenantId}`;

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

  const { byTenantId, byOrganisationId } = useScopeNames();
  const companyName = byTenantId.get(tenantId)?.tenantName ?? 'Company';
  const name = byOrganisationId.get(organisationId) ?? 'Organisation';

  /*
   * Own deadlines or the company's. Follows the server until someone picks,
   * and goes back to following it whenever that answer changes (after a save
   * or a revert): a pick only counts against the answer it was made on, so
   * the choice always starts from what is really in force.
   */
  const isCustom = policy?.isCustom ?? false;
  const [pick, setPick] = useState<{ onCustom: boolean; own: boolean }>();
  const own = pick && pick.onCustom === isCustom ? pick.own : isCustom;
  const pickOwn = (value: boolean) =>
    setPick({ onCustom: isCustom, own: value });

  const switchToCompanys = async () => {
    if (!isCustom) {
      // Nothing saved yet: just drop the draft.
      pickOwn(false);
      return;
    }
    const ok = await confirm({
      title: `Use ${companyName}'s deadlines?`,
      body: `${name} will use ${companyName}'s deadlines. Open tickets keep their current due dates.`,
      confirmLabel: `Use ${companyName}'s deadlines`,
    });
    if (!ok) return;
    const done = () => {
      toast(`${name} now uses ${companyName}'s deadlines`, {
        variant: 'success',
      });
      setPick(undefined);
    };
    revert.mutate(key, {
      onSuccess: done,
      onError: error => {
        // 404: it had no policy of its own, so it already uses the company's.
        if (
          (error as { response?: { status?: number } }).response?.status === 404
        ) {
          done();
          return;
        }
        toast(`Couldn't switch to ${companyName}'s deadlines`, {
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
          message="Company deadlines are set by Netcorp's helpdesk admins."
        />
      </div>
    );
  }
  if (loadingAccess || isLoading || !policy) return <AppLoadingSplash />;

  const inheritedNote =
    policy.source === 'Company'
      ? `Showing ${companyName}'s deadlines.`
      : `${companyName} has no deadlines of its own, so these are the default deadlines.`;

  return (
    <DeadlinePolicyForm
      // Remounted on switching, so leaving "Set deadlines" drops the draft
      // and the read-only view shows exactly what is inherited.
      key={own ? 'own' : 'inherited'}
      principalId={principalId}
      policyKey={key}
      policy={policy}
      name={name}
      breadcrumbsKey="configuration.company-deadlines.organisation"
      breadcrumbsParams={{ tenantId, companyName, name }}
      tenantId={tenantId}
      organisationId={organisationId}
      applyQuestion={`Apply to the ${policy.inheritingOpenTickets} open tickets in ${name} too?`}
      readOnly={!own}
      // Taking the inherited values as its own is a save in itself.
      saveUnchanged={own && !policy.isCustom}
      onCancel={() => navigate('/configuration/company-deadlines')}
    >
      {dialog}
      <div className="text-default-600 -mt-2 mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className={`bg-green-100 text-green-800 ${pill}`}>
          Organisation
        </span>
        <span>
          of{' '}
          <NavLink
            to={companyPath}
            className="text-primary font-medium hover:underline"
          >
            {companyName}
          </NavLink>
          . {policy.openTickets} open tickets, {policy.lateTickets} late.
        </span>
      </div>

      <fieldset className="border-default-200 mb-6 flex flex-col gap-2 rounded-md border px-4 py-3 text-sm">
        <legend className="sr-only">Which deadlines {name} uses</legend>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="deadlineSource"
            className="accent-primary"
            checked={!own}
            disabled={revert.isPending}
            onChange={() => void switchToCompanys()}
          />
          <span className="font-semibold">Use {companyName}'s deadlines</span>
          {!own && <span className="text-default-500">{inheritedNote}</span>}
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="deadlineSource"
            className="accent-primary"
            checked={own}
            onChange={() => pickOwn(true)}
          />
          <span className="font-semibold">Set deadlines for {name}</span>
          {own && !policy.isCustom && (
            <span className="text-default-500">
              Starts from {companyName}'s. Save to keep them for {name}.
            </span>
          )}
        </label>
      </fieldset>
    </DeadlinePolicyForm>
  );
}

export default OrganisationDeadlinePage;
