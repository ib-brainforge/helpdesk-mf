/**
 * Principal approval workflow create page — /principal/[principalId]/approvals/new
 *
 * W1-P8: Migrated from raw useState form to <FormPage> with useEntityForm.
 */

import { APPROVAL_MODE_LABELS } from '@/constants/approvalLabels';
import { usePrincipal } from '@/hooks/usePrincipal';
import { useCreatePrincipalApprovalWorkflow } from '@/hooks/usePrincipalApprovalWorkflows';
import {
  BaseCheckbox,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  PageSpinner,
} from '@brainforgeau/components';
import {
  FormPage,
  PendingCrumb,
  useEntityForm,
} from '@brainforgeau/components/page';
import { HelpdeskDomainApprovalsEnumsApprovalMode } from '@brainforgeau/helpdesk-client';
import { withAuthenticationRequired } from '@brainforgeau/security';
import {
  useNavigate,
  useOutletContext,
  useParams,
} from '@modern-js/runtime/router';
import { z } from 'zod';
import type { PrincipalOutletContext } from '../../layout';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const approvalWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  approvalMode: z.nativeEnum(HelpdeskDomainApprovalsEnumsApprovalMode),
  isActive: z.boolean(),
  triggerOnCreation: z.boolean(),
});

type ApprovalWorkflowFormData = z.infer<typeof approvalWorkflowSchema>;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function PrincipalApprovalWorkflowNewPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();
  const { data: principal } = usePrincipal(principalId);
  const createMutation = useCreatePrincipalApprovalWorkflow(principalId ?? '');

  const form = useEntityForm<typeof approvalWorkflowSchema>({
    schema: approvalWorkflowSchema,
    defaultValues: {
      name: '',
      description: '',
      approvalMode: HelpdeskDomainApprovalsEnumsApprovalMode.Sequential,
      isActive: true,
      triggerOnCreation: false,
    },
    onSubmit: async (values: ApprovalWorkflowFormData) => {
      await createMutation.mutateAsync({
        name: values.name.trim(),
        description: values.description.trim() || null,
        approvalMode: values.approvalMode,
        isActive: values.isActive,
        triggerOnCreation: values.triggerOnCreation,
        triggerOnStatusChange: false,
        steps: [],
      });
      navigate(`/principal/${principalId}/approvals`);
    },
    invalidateQueryKeys: [['principal-approval-workflows', principalId]],
    toast: { success: 'Approval workflow created', error: 'Create failed' },
  });

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

  const f = form.form;

  return (
    <FormPage
      title="New Approval Workflow"
      breadcrumbsKey="principal.approvals.new"
      breadcrumbsParams={{
        principalId: principalId!,
        principalName: principal?.name ?? PendingCrumb,
      }}
      form={form}
      onCancel={() => navigate(`/principal/${principalId}/approvals`)}
    >
      <FormPage.Section title="Workflow Details" columns={2}>
        <f.Field name="name">
          {field => (
            <BaseInput
              label="Name"
              isRequired
              placeholder="e.g. Manager Approval"
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
            />
          )}
        </f.Field>

        <f.Field name="approvalMode">
          {field => (
            <BaseSelect
              label="Approval Mode"
              selectedKey={field.state.value}
              onSelectionChange={key => {
                if (key)
                  field.handleChange(
                    String(key) as HelpdeskDomainApprovalsEnumsApprovalMode,
                  );
              }}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
            >
              {Object.entries(APPROVAL_MODE_LABELS).map(([value, label]) => (
                <BaseSelectItem key={value} value={value}>{label}</BaseSelectItem>
              ))}
            </BaseSelect>
          )}
        </f.Field>

        <f.Field name="description">
          {field => (
            <BaseInput
              label="Description"
              placeholder="Optional description"
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="md:col-span-2"
            />
          )}
        </f.Field>
      </FormPage.Section>

      <FormPage.Section title="Trigger Settings" columns={2}>
        <f.Field name="isActive">
          {field => (
            <BaseCheckbox
              isSelected={field.state.value}
              onValueChange={field.handleChange}
            >
              Active
            </BaseCheckbox>
          )}
        </f.Field>

        <f.Field name="triggerOnCreation">
          {field => (
            <BaseCheckbox
              isSelected={field.state.value}
              onValueChange={field.handleChange}
            >
              Trigger on ticket creation
            </BaseCheckbox>
          )}
        </f.Field>
      </FormPage.Section>
    </FormPage>
  );
}

export default withAuthenticationRequired(PrincipalApprovalWorkflowNewPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
