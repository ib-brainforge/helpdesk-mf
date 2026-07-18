/**
 * Principal approval workflow detail page — /principal/[principalId]/approvals/[id]
 *
 * W1-P7: Migrated to <DetailPage> with useDetailTabState for ?tab= URL sync.
 * Single "details" tab is form-bearing; formActions wired to that tab only.
 * Steps display is read-only within the form section — step editor is future work.
 */

import { APPROVAL_MODE_LABELS } from '@/constants/approvalLabels';
import { usePrincipal } from '@/hooks/usePrincipal';
import {
  usePrincipalApprovalWorkflow,
  useUpdatePrincipalApprovalWorkflow,
} from '@/hooks/usePrincipalApprovalWorkflows';
import { useTabSearchParam } from '@/hooks/useTabSearchParam';
import {
  AuthSplash,
  BaseCheckbox,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  LoadingSplash,
} from '@brainforgeau/components';
import {
  DetailPage,
  PendingCrumb,
  useDetailTabState,
  useEntityForm,
} from '@brainforgeau/components/page';
import { HelpdeskDomainApprovalsEnumsApprovalMode } from '@brainforgeau/helpdesk-client';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useOutletContext, useParams } from '@modern-js/runtime/router';
import { z } from 'zod';
import type { PrincipalOutletContext } from '../../layout';

const approvalWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullish(),
  approvalMode: z.nativeEnum(HelpdeskDomainApprovalsEnumsApprovalMode),
  isActive: z.boolean(),
  triggerOnCreation: z.boolean(),
  triggerOnStatusChange: z.boolean(),
});

type ApprovalWorkflowFormData = z.infer<typeof approvalWorkflowSchema>;

function PrincipalApprovalWorkflowDetailPage() {
  const { principalId, id } = useParams<{ principalId: string; id: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const { data: principal } = usePrincipal(principalId);

  const { data: workflow, isLoading } = usePrincipalApprovalWorkflow(
    principalId ?? '',
    id ?? '',
  );
  const updateWorkflow = useUpdatePrincipalApprovalWorkflow(principalId ?? '');

  const { getParam, setParam } = useTabSearchParam();
  const { activeTab, setActiveTab } = useDetailTabState({
    defaultTab: 'details',
    getParam,
    setParam,
  });

  const detailsForm = useEntityForm<typeof approvalWorkflowSchema>({
    schema: approvalWorkflowSchema,
    defaultValues: {
      name: '',
      description: null,
      approvalMode: HelpdeskDomainApprovalsEnumsApprovalMode.Sequential,
      isActive: true,
      triggerOnCreation: false,
      triggerOnStatusChange: false,
    },
    values: workflow
      ? {
          name: workflow.name ?? '',
          description: workflow.description ?? null,
          approvalMode:
            workflow.approvalMode ??
            HelpdeskDomainApprovalsEnumsApprovalMode.Sequential,
          isActive: workflow.isActive ?? true,
          triggerOnCreation: workflow.triggerOnCreation ?? false,
          triggerOnStatusChange: workflow.triggerOnStatusChange ?? false,
        }
      : undefined,
    onSubmit: async (values: ApprovalWorkflowFormData) => {
      if (!id) return;
      await updateWorkflow.mutateAsync({
        id,
        command: {
          name: values.name.trim(),
          description: values.description?.trim() || null,
          approvalMode: values.approvalMode,
          isActive: values.isActive,
          triggerOnCreation: values.triggerOnCreation,
          triggerOnStatusChange: values.triggerOnStatusChange,
          steps: workflow?.steps ?? [],
        },
      });
    },
    invalidateQueryKeys: [
      ['principal-approval-workflows', principalId],
      ['principal-approval-workflows', principalId, id],
    ],
    toast: { success: 'Approval workflow saved', error: 'Save failed' },
  });

  if (isLoading || !workflow) {
    return <LoadingSplash />;
  }

  if (context?.level !== 'admin') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-xl font-semibold">Access Denied</p>
        <p className="text-default-500 text-sm">
          Approval workflow management requires admin access.
        </p>
      </div>
    );
  }

  const form = detailsForm.form;

  return (
    <DetailPage
      title={workflow.name ?? 'Untitled Approval Workflow'}
      breadcrumbsKey="principal.approvals.detail"
      breadcrumbsParams={{
        principalId: principalId!,
        principalName: principal?.name ?? PendingCrumb,
        id: id!,
        name: workflow.name ?? PendingCrumb,
      }}
      documentTitle={
        workflow.name ? `Approval Workflow: ${workflow.name}` : undefined
      }
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <DetailPage.Tab
        id="details"
        title="Details"
        formActions={detailsForm.formActions}
      >
        <div className="max-w-lg">
          <form className="flex flex-col gap-4">
            <form.Field name="name">
              {field => (
                <BaseInput
                  label="Name"
                  isRequired
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  onBlur={field.handleBlur}
                  isInvalid={field.state.meta.errors.length > 0}
                  errorMessage={field.state.meta.errors
                    .map(e => String(e))
                    .join(', ')}
                />
              )}
            </form.Field>

            <form.Field name="description">
              {field => (
                <BaseInput
                  label="Description"
                  value={field.state.value ?? ''}
                  onValueChange={field.handleChange}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>

            <form.Field name="approvalMode">
              {field => (
                <BaseSelect
                  label="Approval mode"
                  selectedKey={field.state.value}
                  onSelectionChange={key => {
                    if (key)
                      field.handleChange(
                        String(key) as HelpdeskDomainApprovalsEnumsApprovalMode,
                      );
                  }}
                >
                  {Object.entries(APPROVAL_MODE_LABELS).map(
                    ([value, label]) => (
                      <BaseSelectItem key={value} value={value}>
                        {label}
                      </BaseSelectItem>
                    ),
                  )}
                </BaseSelect>
              )}
            </form.Field>

            <div className="flex flex-col gap-2">
              <form.Field name="isActive">
                {field => (
                  <BaseCheckbox
                    isSelected={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    Active
                  </BaseCheckbox>
                )}
              </form.Field>

              <form.Field name="triggerOnCreation">
                {field => (
                  <BaseCheckbox
                    isSelected={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    Trigger on ticket creation
                  </BaseCheckbox>
                )}
              </form.Field>

              <form.Field name="triggerOnStatusChange">
                {field => (
                  <BaseCheckbox
                    isSelected={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    Trigger on status change
                  </BaseCheckbox>
                )}
              </form.Field>
            </div>

            {(workflow.steps?.length ?? 0) > 0 && (
              <div className="rounded border p-3 text-sm text-default-500">
                {workflow.steps?.length} step(s) configured. Step editor coming
                in a follow-up iteration.
              </div>
            )}
          </form>
        </div>
      </DetailPage.Tab>
    </DetailPage>
  );
}

export default withAuthenticationRequired(PrincipalApprovalWorkflowDetailPage, {
  OnRedirecting: () => <AuthSplash />,
});
