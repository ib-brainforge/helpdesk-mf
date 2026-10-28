import type { CompanyDeadlinePolicyDto } from '@/api/local/company-deadlines';
import { useDiscardGuard } from '@/hooks/useDiscardGuard';
import { extractErrorMessage } from '@/utils/error-handling';
import { BaseCheckbox } from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import {
  PageBody,
  PageHeader,
  useConfirm,
  useEntityForm,
} from '@brainforgeau/components/page';
import { toast } from '@heroui/react';
import { useSearchParams } from '@modern-js/runtime/router';
import { useStore } from '@tanstack/react-form';
import { type FC, type ReactNode, useMemo, useState } from 'react';
import {
  type PolicyFormValues,
  policyFormSchema,
  toFormValues,
  toPolicyInput,
} from '../deadlinePolicy';
import {
  useRevertCompanyDeadlinePolicy,
  useSaveCompanyDeadlinePolicy,
} from '../hooks/useCompanyDeadlines';
import { ClockSection } from './ClockSection';
import { DeadlineSummaryCard } from './DeadlineSummaryCard';
import { TargetsSection } from './TargetsSection';
import { WorkedExample } from './WorkedExample';

/*
 * One tenant's deadlines, for provider staff: read, edit, save and revert
 * to the provider default.
 *
 * It opens READING the deadlines in force, in sentences. A tenant on the
 * provider default never shows editable fields: "Set own deadlines" opens the
 * form, starting from the default's values, and nothing changes until Save.
 * Save is the only primary button; Cancel and Reset are plain. Leaving with
 * unsaved edits, by Cancel or by any link, asks "Discard changes?".
 */

export interface TenantDeadlinePageProps {
  tenantId: string;
  /** The tenant's name, in the title, buttons and toasts. */
  name: string;
  policy: CompanyDeadlinePolicyDto;
}

const Header: FC<{ name: string; actions?: ReactNode }> = ({
  name,
  actions,
}) => (
  <PageHeader
    title={name}
    breadcrumbsKey="provider.deadlines.detail"
    breadcrumbsParams={{ name }}
    documentTitle={`Deadlines: ${name}`}
  >
    {actions && <PageHeader.Actions>{actions}</PageHeader.Actions>}
  </PageHeader>
);

const TicketCounts: FC<{ open: number; late: number }> = ({ open, late }) => (
  <p className="text-default-600 -mt-2 mb-4 text-sm">
    {open} open ticket{open === 1 ? '' : 's'}, {late} late.
  </p>
);

export const TenantDeadlinePage: FC<TenantDeadlinePageProps> = props => {
  // ?edit=1 opens straight on the form.
  const [searchParams] = useSearchParams();
  const [editing, setEditing] = useState(searchParams.get('edit') === '1');
  return editing ? (
    <PolicyEditor {...props} onDone={() => setEditing(false)} />
  ) : (
    <PolicyReader {...props} onEdit={() => setEditing(true)} />
  );
};

const PolicyReader: FC<TenantDeadlinePageProps & { onEdit: () => void }> = ({
  tenantId,
  name,
  policy,
  onEdit,
}) => {
  const values = useMemo(() => toFormValues(policy), [policy]);
  const revert = useRevertCompanyDeadlinePolicy(tenantId);
  const { confirm, dialog } = useConfirm();

  const useDefault = async () => {
    const ok = await confirm({
      title: 'Use the Provider default deadlines?',
      body: `${name} will use the Provider default deadlines. Open tickets keep their current due dates.`,
      confirmLabel: 'Use Provider default',
    });
    if (!ok) return;
    revert.mutate(undefined, {
      onSuccess: () =>
        toast(`${name} now uses the Provider default deadlines`, {
          variant: 'success',
        }),
      onError: error =>
        toast("Couldn't switch to the Provider default", {
          description: extractErrorMessage(error, 'Try again.'),
          variant: 'danger',
        }),
    });
  };

  const edit = (
    <BaseButton variant="bordered" size="sm" onPress={onEdit}>
      {policy.isCustom ? 'Edit' : 'Set own deadlines'}
    </BaseButton>
  );

  return (
    <PageBody>
      <Header name={name} />
      {dialog}
      <TicketCounts open={policy.openTickets} late={policy.lateTickets} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <DeadlineSummaryCard
          title={
            policy.isCustom
              ? `${name}'s deadlines`
              : `${name} uses the Provider default deadlines`
          }
          description={
            policy.isCustom
              ? undefined
              : 'Shown as they are; set its own to change them for this tenant alone.'
          }
          policy={policy}
          actions={
            policy.isCustom ? (
              <>
                <BaseButton
                  variant="light"
                  size="sm"
                  onPress={useDefault}
                  isDisabled={revert.isPending}
                >
                  Use Provider default
                </BaseButton>
                {edit}
              </>
            ) : (
              edit
            )
          }
        />
        <WorkedExample values={values} tenantId={tenantId} />
      </div>
    </PageBody>
  );
};

const PolicyEditor: FC<TenantDeadlinePageProps & { onDone: () => void }> = ({
  tenantId,
  name,
  policy,
  onDone,
}) => {
  const save = useSaveCompanyDeadlinePolicy(tenantId);
  // Starting its own from the default is a change in itself, though no field
  // has moved yet.
  const startsFromDefault = !policy.isCustom;

  const values = useMemo(() => toFormValues(policy), [policy]);
  const entityForm = useEntityForm<typeof policyFormSchema>({
    schema: policyFormSchema,
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
        onDone();
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
  const { form, formActions } = entityForm;
  const draft = useStore(
    form.store,
    // biome-ignore lint/suspicious/noExplicitAny: useEntityForm's form is untyped
    (s: any) => s.values as PolicyFormValues,
  );

  const { isDirty, isSubmitting } = formActions;
  const guard = useDiscardGuard(isDirty && !isSubmitting);
  const cancel = async () => {
    if (await guard.confirmDiscard()) onDone();
  };

  const openTickets = policy.openTickets;

  return (
    <PageBody>
      <Header
        name={name}
        actions={
          <>
            <BaseButton
              variant="light"
              onPress={cancel}
              isDisabled={isSubmitting}
            >
              Cancel
            </BaseButton>
            <BaseButton
              variant="light"
              onPress={formActions.onReset}
              isDisabled={!isDirty || isSubmitting}
            >
              Reset
            </BaseButton>
            <BaseButton
              color="primary"
              onPress={formActions.onSave}
              isDisabled={!(isDirty || startsFromDefault) || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </BaseButton>
          </>
        }
      />
      {guard.dialog}
      <TicketCounts open={policy.openTickets} late={policy.lateTickets} />
      {startsFromDefault && (
        <p className="border-default-200 bg-default-50 text-default-700 mb-4 rounded-md border px-4 py-3 text-sm">
          Setting {name}'s own deadlines, starting from the Provider default.
          Nothing changes until you save, and afterwards they no longer follow
          the default.
        </p>
      )}
      <form
        noValidate
        onSubmit={e => {
          e.preventDefault();
          Promise.resolve(form.handleSubmit()).catch(() => {});
        }}
      >
        <div className="grid gap-8 xl:grid-cols-2">
          <ClockSection form={form} saved={policy} />
          <div className="space-y-4">
            <TargetsSection form={form} saved={policy} companyName={name} />
            <WorkedExample values={draft} live tenantId={tenantId} />
            <form.Field name="applyToOpenTickets">
              {/* biome-ignore lint/suspicious/noExplicitAny: untyped form field */}
              {(f: any) => (
                <div className="border-default-200 rounded-md border px-4 py-3 text-sm">
                  <BaseCheckbox
                    isSelected={openTickets > 0 && f.state.value}
                    isDisabled={openTickets === 0}
                    onValueChange={f.handleChange}
                  >
                    Apply to open tickets ({openTickets})
                  </BaseCheckbox>
                  <p className="text-default-500 mt-1 text-xs">
                    {openTickets === 0
                      ? '0 open tickets use these deadlines, so there is nothing to update.'
                      : `Gives the ${openTickets} open tickets using these deadlines new due dates. Otherwise only new tickets use them.`}
                  </p>
                </div>
              )}
            </form.Field>
          </div>
        </div>
      </form>
    </PageBody>
  );
};
