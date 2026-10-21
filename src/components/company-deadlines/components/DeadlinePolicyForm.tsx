import type { CompanyDeadlinePolicyDto } from '@/api/local/company-deadlines';
import { extractErrorMessage } from '@/utils/error-handling';
import { FormPage, useEntityForm } from '@brainforgeau/components/page';
import { toast } from '@heroui/react';
import { type FC, type ReactNode, useMemo } from 'react';
import {
  type PolicyFormValues,
  policyFormSchema,
  toFormValues,
  toPolicyInput,
} from '../deadlinePolicy';
import { useSaveCompanyDeadlinePolicy } from '../hooks/useCompanyDeadlines';
import { ClockSection } from './ClockSection';
import { TargetsSection } from './TargetsSection';
import { WorkedExample } from './WorkedExample';

interface DeadlinePolicyFormProps {
  principalId?: string;
  /** Where it saves: policyKey(tenantId, organisationId). */
  policyKey: string;
  policy: CompanyDeadlinePolicyDto;
  /** The page title, and the name in its toasts and copy. */
  name: string;
  breadcrumbsKey: string;
  breadcrumbsParams?: Record<string, unknown>;
  /** For the worked example. Null for the default policy. */
  tenantId: string | null;
  organisationId?: string | null;
  /** "Apply to the 12 open tickets too?" Asked only when that number is above zero. */
  applyQuestion: string;
  headerActions?: ReactNode;
  /**
   * Inherited values, shown but not editable. The worked example stays live,
   * so the inherited deadlines can still be checked.
   */
  readOnly?: boolean;
  /**
   * Save is offered before anything is changed: an organisation taking the
   * values it inherits as its own policy is a real change, though no field
   * moved.
   */
  saveUnchanged?: boolean;
  onCancel: () => void;
  /** Above the form: what the page is and what it affects. */
  children?: ReactNode;
}

/**
 * The deadlines form, used by the default, a company and an organisation:
 * clock, targets, the worked example and "apply to open tickets". One
 * component, so all three pages edit and save a policy the same way.
 */
export const DeadlinePolicyForm: FC<DeadlinePolicyFormProps> = ({
  principalId,
  policyKey,
  policy,
  name,
  breadcrumbsKey,
  breadcrumbsParams,
  tenantId,
  organisationId = null,
  applyQuestion,
  headerActions,
  readOnly = false,
  saveUnchanged = false,
  onCancel,
  children,
}) => {
  const save = useSaveCompanyDeadlinePolicy(principalId, policyKey);

  // Memoised on the policy, so the form only resets when the server's copy
  // changes (on load and after a save), never while someone is typing.
  const values = useMemo(() => toFormValues(policy), [policy]);

  const entityForm = useEntityForm<typeof policyFormSchema>({
    schema: policyFormSchema,
    // The loaded policy, not a fresh object of zeros each render: the form
    // re-applies changed defaultValues while untouched, so a new zeros object
    // on every render could land after the reset to `values` and leave every
    // Reply by and Fix by field at 0 (QA-04, on a cold load).
    defaultValues: values,
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

  const pageForm = useMemo(
    () =>
      saveUnchanged && !readOnly
        ? {
            ...entityForm,
            formActions: { ...entityForm.formActions, isDirty: true },
          }
        : entityForm,
    [entityForm, saveUnchanged, readOnly],
  );

  const form = entityForm.form;
  const openTickets = policy.inheritingOpenTickets;

  return (
    <FormPage
      title={name}
      breadcrumbsKey={breadcrumbsKey}
      breadcrumbsParams={breadcrumbsParams}
      documentTitle={`Deadlines: ${name}`}
      form={pageForm}
      onCancel={onCancel}
      headerActions={headerActions}
    >
      {children}

      <div className="grid gap-8 xl:grid-cols-2">
        <div inert={readOnly} className={readOnly ? 'opacity-70' : undefined}>
          <ClockSection form={form} saved={policy} principalId={principalId} />
        </div>
        <div className="space-y-4">
          <div inert={readOnly} className={readOnly ? 'opacity-70' : undefined}>
            <TargetsSection form={form} saved={policy} companyName={name} />
          </div>
          <WorkedExample
            form={form}
            principalId={principalId}
            tenantId={tenantId}
            organisationId={organisationId}
          />
          {!readOnly && openTickets > 0 && (
            <form.Field name="applyToOpenTickets">
              {/* biome-ignore lint/suspicious/noExplicitAny: untyped form field */}
              {(f: any) => (
                <fieldset className="border-default-200 flex flex-wrap items-center gap-4 rounded-md border px-4 py-3 text-sm">
                  <legend className="sr-only">Apply to open tickets</legend>
                  <span className="font-semibold">{applyQuestion}</span>
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
};
