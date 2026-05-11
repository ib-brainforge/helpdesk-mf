/**
 * Principal SLA policy create page — /principal/[principalId]/sla-policies/new
 *
 * W1-P8: Migrated from raw useState form to <FormPage> with useEntityForm.
 */

import { useCreatePrincipalSlaPolicy } from '@/hooks/usePrincipalSlaPolicies';
import { BaseCheckbox, BaseInput, PageSpinner } from '@brainforgeau/components';
import {
  FormPage,
  PendingCrumb,
  useEntityForm,
} from '@brainforgeau/components/page';
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

const slaPolicySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  isDefault: z.boolean(),
});

type SlaPolicyFormData = z.infer<typeof slaPolicySchema>;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function PrincipalSlaPolicyNewPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();
  const createMutation = useCreatePrincipalSlaPolicy(principalId ?? '');

  const form = useEntityForm<typeof slaPolicySchema>({
    schema: slaPolicySchema,
    defaultValues: {
      name: '',
      description: '',
      isDefault: false,
    },
    onSubmit: async (values: SlaPolicyFormData) => {
      await createMutation.mutateAsync({
        name: values.name.trim(),
        description: values.description.trim() || null,
        isDefault: values.isDefault,
      });
      navigate(`/principal/${principalId}/sla-policies`);
    },
    invalidateQueryKeys: [['principal-sla-policies', principalId]],
    toast: { success: 'SLA policy created', error: 'Create failed' },
  });

  if (context?.level !== 'admin') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-xl font-semibold">Access Denied</p>
        <p className="text-default-500 text-sm">
          SLA policy management requires admin access.
        </p>
      </div>
    );
  }

  const f = form.form;

  return (
    <FormPage
      title="New SLA Policy"
      breadcrumbsKey="principal.sla-policies.new"
      breadcrumbsParams={{
        principalId: principalId!,
        principalName: PendingCrumb,
      }}
      form={form}
      onCancel={() => navigate(`/principal/${principalId}/sla-policies`)}
    >
      <FormPage.Section title="Policy Details" columns={2}>
        <f.Field name="name">
          {field => (
            <BaseInput
              label="Name"
              isRequired
              placeholder="e.g. Standard SLA"
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
            />
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
            />
          )}
        </f.Field>

        <f.Field name="isDefault">
          {field => (
            <BaseCheckbox
              isSelected={field.state.value}
              onValueChange={field.handleChange}
            >
              Set as default policy
            </BaseCheckbox>
          )}
        </f.Field>
      </FormPage.Section>
    </FormPage>
  );
}

export default withAuthenticationRequired(PrincipalSlaPolicyNewPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
