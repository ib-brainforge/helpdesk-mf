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
import { resolveDeadlines } from '../resolveDeadlines';
import { ClockSection } from './ClockSection';
import { DeadlineSummaryCard } from './DeadlineSummaryCard';
import { TargetsSection } from './TargetsSection';
import { WorkedExample } from './WorkedExample';

/*
 * One policy page, for the default, a tenant and an organisation, so all
 * three read, edit, save and revert the same way.
 *
 * It opens READING the deadlines in force, in sentences, with where each
 * comes from ("From Remondis", "From default"). An inheriting page never
 * shows editable fields: "Set own deadlines" opens the form, starting from
 * the inherited values, and nothing changes until Save. Save is the only
 * primary button; Cancel and Reset are plain. Leaving with unsaved edits,
 * by Cancel or by any link, asks "Discard changes?".
 */

interface HeaderProps {
  title: string;
  breadcrumbsKey: string;
  breadcrumbsParams?: Record<string, unknown>;
}

export interface DeadlinePolicyPageProps extends HeaderProps {
  principalId?: string;
  /** Where it saves: policyKey(tenantId, organisationId). */
  policyKey: string;
  policy: CompanyDeadlinePolicyDto;
  /** For the worked example. Null for the default policy. */
  tenantId: string | null;
  organisationId?: string | null;
  /**
   * What this page uses without its own: its name ("default", "Remondis")
   * and, when it has its own, that policy, to say what differs. Null for
   * the default, which has nothing above it.
   */
  inherited: { name: string; policy?: CompanyDeadlinePolicyDto } | null;
  /** The name this page's deadlines are for, in buttons and toasts. */
  name: string;
  /** Under the title, in both modes: what the page is and its tickets. */
  intro?: ReactNode;
  /** Below the deadlines while reading (a tenant's organisations). */
  children?: ReactNode;
}

/** "the default" or "Remondis's", before "deadlines". */
const theirs = (name: string) =>
  name === 'default' ? 'the default' : `${name}'s`;

const Header: FC<HeaderProps & { actions?: ReactNode }> = ({
  title,
  breadcrumbsKey,
  breadcrumbsParams,
  actions,
}) => (
  <PageHeader
    title={title}
    breadcrumbsKey={breadcrumbsKey}
    breadcrumbsParams={breadcrumbsParams}
    documentTitle={`Deadlines: ${title}`}
  >
    {actions && <PageHeader.Actions>{actions}</PageHeader.Actions>}
  </PageHeader>
);

export const DeadlinePolicyPage: FC<DeadlinePolicyPageProps> = props => {
  // ?edit=1 opens straight on the form (the list's Default card, Edit).
  const [searchParams] = useSearchParams();
  const [editing, setEditing] = useState(searchParams.get('edit') === '1');
  return editing ? (
    <PolicyEditor {...props} onDone={() => setEditing(false)} />
  ) : (
    <PolicyReader {...props} onEdit={() => setEditing(true)} />
  );
};

const PolicyReader: FC<DeadlinePolicyPageProps & { onEdit: () => void }> = ({
  principalId,
  policyKey,
  policy,
  tenantId,
  organisationId,
  inherited,
  name,
  intro,
  children,
  onEdit,
  ...header
}) => {
  const isDefault = inherited === null;
  const hasOwn = isDefault || policy.isCustom;
  const resolved = useMemo(
    () =>
      resolveDeadlines({
        values: policy,
        hasOwn,
        inherited: inherited?.policy ?? null,
        fromName: inherited?.name ?? 'default',
      }),
    [policy, hasOwn, inherited],
  );
  const values = useMemo(() => toFormValues(policy), [policy]);

  const revert = useRevertCompanyDeadlinePolicy(principalId);
  const { confirm, dialog } = useConfirm();
  const switchToInherited = async () => {
    if (!inherited) return;
    const label = `${theirs(inherited.name)} deadlines`;
    const ok = await confirm({
      title: `Use ${label}?`,
      body: `${name} will use ${label}. Open tickets keep their current due dates.`,
      confirmLabel: `Use ${label}`,
    });
    if (!ok) return;
    revert.mutate(policyKey, {
      onSuccess: () =>
        toast(`${name} now uses ${label}`, { variant: 'success' }),
      onError: error => {
        // 404: it had none of its own, so it already uses theirs.
        if (
          (error as { response?: { status?: number } }).response?.status === 404
        )
          return;
        toast(`Couldn't switch to ${label}`, {
          description: extractErrorMessage(error, 'Try again.'),
          variant: 'danger',
        });
      },
    });
  };

  const edit = (
    <BaseButton variant="bordered" size="sm" onPress={onEdit}>
      {hasOwn ? 'Edit' : 'Set own deadlines'}
    </BaseButton>
  );
  const actions =
    inherited && hasOwn ? (
      <>
        <BaseButton
          variant="light"
          size="sm"
          onPress={switchToInherited}
          isDisabled={revert.isPending}
        >
          Use {inherited.name === 'default' ? 'default' : `${inherited.name}'s`}{' '}
          deadlines
        </BaseButton>
        {edit}
      </>
    ) : (
      edit
    );

  return (
    <PageBody>
      <Header {...header} />
      {dialog}
      {intro}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <DeadlineSummaryCard
          title={
            hasOwn || !inherited
              ? `${name}'s deadlines`
              : `${name} uses ${theirs(inherited.name)} deadlines`
          }
          description={
            isDefault
              ? 'Every tenant without deadlines of its own uses these.'
              : hasOwn
                ? undefined
                : 'Shown as they are; set its own to change them for it alone.'
          }
          resolved={resolved}
          isDefault={isDefault}
          actions={actions}
        />
        <WorkedExample
          values={values}
          principalId={principalId}
          tenantId={tenantId}
          organisationId={organisationId}
        />
      </div>
      {children}
    </PageBody>
  );
};

const PolicyEditor: FC<DeadlinePolicyPageProps & { onDone: () => void }> = ({
  principalId,
  policyKey,
  policy,
  tenantId,
  organisationId = null,
  inherited,
  name,
  intro,
  onDone,
  ...header
}) => {
  const save = useSaveCompanyDeadlinePolicy(principalId, policyKey);
  // Starting its own from inherited values is a change in itself, though
  // no field has moved yet.
  const startsFromInherited = inherited !== null && !policy.isCustom;

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

  const openTickets = policy.inheritingOpenTickets;

  return (
    <PageBody>
      <Header
        {...header}
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
              isDisabled={!(isDirty || startsFromInherited) || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </BaseButton>
          </>
        }
      />
      {guard.dialog}
      {intro}
      {startsFromInherited && (
        <p className="border-default-200 bg-default-50 text-default-700 mb-4 rounded-md border px-4 py-3 text-sm">
          Setting {name}'s own deadlines, starting from {theirs(inherited.name)}
          . Nothing changes until you save, and afterwards they no longer follow{' '}
          {inherited.name === 'default' ? 'the default' : inherited.name}.
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
          <ClockSection form={form} saved={policy} principalId={principalId} />
          <div className="space-y-4">
            <TargetsSection form={form} saved={policy} companyName={name} />
            <WorkedExample
              values={draft}
              live
              principalId={principalId}
              tenantId={tenantId}
              organisationId={organisationId}
            />
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
