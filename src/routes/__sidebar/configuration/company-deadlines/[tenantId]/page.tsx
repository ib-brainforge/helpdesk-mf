/**
 * One company's deadlines: /configuration/company-deadlines/[tenantId]
 *
 * Also the default policy, at /configuration/company-deadlines/default, which
 * every company without its own follows. Netcorp staff only.
 *
 * The worked example asks the backend, with the unsaved form, what a ticket
 * would get. Nothing on this page calculates a deadline.
 */
import { DEFAULT_POLICY_KEY } from '@/api/local/company-deadlines';
import { AppLoadingSplash } from '@/components/AppSplash';
import { ClockSection } from '@/components/company-deadlines/components/ClockSection';
import { TargetsSection } from '@/components/company-deadlines/components/TargetsSection';
import { WorkedExample } from '@/components/company-deadlines/components/WorkedExample';
import {
  type PolicyFormValues,
  policyFormSchema,
  toFormValues,
  toPolicyInput,
} from '@/components/company-deadlines/deadlinePolicy';
import {
  useCompanyDeadlinePolicy,
  useDeadlinesPrincipal,
  useRevertCompanyDeadlinePolicy,
  useSaveCompanyDeadlinePolicy,
} from '@/components/company-deadlines/hooks/useCompanyDeadlines';
import { useScopeNames } from '@/hooks/useScopeNames';
import { extractErrorMessage } from '@/utils/error-handling';
import { BaseButton } from '@brainforgeau/components/button';
import {
  FormPage,
  useConfirm,
  useEntityForm,
} from '@brainforgeau/components/page';
import { AccessDenied } from '@brainforgeau/security';
import { toast } from '@heroui/react';
import { useNavigate, useParams } from '@modern-js/runtime/router';
import { useMemo } from 'react';

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
  const save = useSaveCompanyDeadlinePolicy(enabledPrincipal, key);
  const revert = useRevertCompanyDeadlinePolicy(enabledPrincipal);
  const { confirm, dialog } = useConfirm();

  const { byTenantId, organisationOptions } = useScopeNames();
  const name = isDefault
    ? 'Default for all companies'
    : (byTenantId.get(key)?.tenantName ?? 'Company');
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

  // Memoised on the policy, so the form only resets when the server's copy
  // changes (on load and after a save), never while someone is typing.
  const values = useMemo(
    () => (policy ? toFormValues(policy) : undefined),
    [policy],
  );

  const entityForm = useEntityForm<typeof policyFormSchema>({
    schema: policyFormSchema,
    defaultValues: toFormValues(undefined),
    values,
    onSubmit: async ({ applyToOpenTickets, ...rest }: PolicyFormValues) => {
      try {
        const result = await save.mutateAsync({
          ...toPolicyInput(rest),
          applyToOpenTickets,
        });
        toast(`Deadlines saved for ${name}`, {
          description: applyToOpenTickets
            ? `${result.recalculatedTickets} open tickets were given new due dates.`
            : 'New tickets will use them.',
          variant: 'success',
        });
      } catch (error) {
        toast("Couldn't save these deadlines", {
          description: extractErrorMessage(
            error,
            'Helpdesk refused the change. Check the hours and targets, then try again.',
          ),
          variant: 'danger',
        });
        throw error;
      }
    },
  });

  const handleUseDefault = async () => {
    if (!tenantId) return;
    const ok = await confirm({
      title: 'Use the default deadlines?',
      body: `${name} will use the default deadlines. Open tickets keep their current due dates.`,
      confirmLabel: 'Use default deadlines',
    });
    if (!ok) return;
    revert.mutate(tenantId, {
      onSuccess: () => {
        toast(`${name} now uses the default deadlines`, { variant: 'success' });
        navigate('/configuration/company-deadlines');
      },
      onError: error =>
        toast("Couldn't switch to the default deadlines", {
          description: extractErrorMessage(error, 'Try again.'),
          variant: 'danger',
        }),
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

  const form = entityForm.form;
  const openTickets = policy.openTickets;

  return (
    <FormPage
      title={name}
      breadcrumbsKey="configuration.company-deadlines.detail"
      breadcrumbsParams={{ name }}
      documentTitle={`Deadlines: ${name}`}
      form={entityForm}
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
          <span>Used by every company that has no deadlines of its own.</span>
        ) : (
          <>
            <span className={`bg-lighter-blue text-blue ${pill}`}>Company</span>
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
              {openTickets} open tickets, {policy.lateTickets} late. Deadlines
              apply to every organisation in this company.
              {!policy.isCustom && ' It follows the default until you save.'}
            </span>
          </>
        )}
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <ClockSection form={form} saved={policy} principalId={principalId} />
        <div className="space-y-4">
          <TargetsSection form={form} saved={policy} companyName={name} />
          <WorkedExample
            form={form}
            principalId={principalId}
            tenantId={tenantId}
          />
          {openTickets > 0 && (
            <form.Field name="applyToOpenTickets">
              {/* biome-ignore lint/suspicious/noExplicitAny: untyped form field */}
              {(f: any) => (
                <fieldset className="border-default-200 flex flex-wrap items-center gap-4 rounded-md border px-4 py-3 text-sm">
                  <legend className="sr-only">Apply to open tickets</legend>
                  <span className="font-semibold">
                    Apply to the {openTickets} open tickets too?
                  </span>
                  {[
                    { value: true, label: 'Yes' },
                    { value: false, label: 'No, new tickets only' },
                  ].map(o => (
                    <label
                      key={o.label}
                      className="flex cursor-pointer items-center gap-1.5"
                    >
                      <input
                        type="radio"
                        name="applyToOpenTickets"
                        className="accent-primary"
                        checked={f.state.value === o.value}
                        onChange={() => f.handleChange(o.value)}
                      />
                      {o.label}
                    </label>
                  ))}
                </fieldset>
              )}
            </form.Field>
          )}
        </div>
      </div>
    </FormPage>
  );
}

export default CompanyDeadlinePage;
