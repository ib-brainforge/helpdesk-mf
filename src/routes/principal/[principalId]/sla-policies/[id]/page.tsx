/**
 * Principal SLA policy detail page — /principal/[principalId]/sla-policies/[id]
 *
 * W1-P7: Migrated to <DetailPage> with useDetailTabState for ?tab= URL sync.
 * Single "details" tab is form-bearing; formActions wired to that tab only.
 */

import { usePrincipal } from '@/hooks/usePrincipal';
import {
  usePrincipalSlaPolicy,
  useUpdatePrincipalSlaPolicy,
} from '@/hooks/usePrincipalSlaPolicies';
import { useTabSearchParam } from '@/hooks/useTabSearchParam';
import {
  AuthSplash,
  BaseCheckbox,
  BaseInput,
  LoadingSplash,
} from '@brainforgeau/components';
import {
  DetailPage,
  PendingCrumb,
  useDetailTabState,
  useEntityForm,
} from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useOutletContext, useParams } from '@modern-js/runtime/router';
import { z } from 'zod';
import type { PrincipalOutletContext } from '../../layout';

const slaPolicySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullish(),
  isDefault: z.boolean(),
});

type SlaPolicyFormData = z.infer<typeof slaPolicySchema>;

function PrincipalSlaPolicyDetailPage() {
  const { principalId, id } = useParams<{ principalId: string; id: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const { data: principal } = usePrincipal(principalId);

  const { data: policy, isLoading } = usePrincipalSlaPolicy(
    principalId ?? '',
    id ?? '',
  );
  const updatePolicy = useUpdatePrincipalSlaPolicy(principalId ?? '');

  const { getParam, setParam } = useTabSearchParam();
  const { activeTab, setActiveTab } = useDetailTabState({
    defaultTab: 'details',
    getParam,
    setParam,
  });

  const detailsForm = useEntityForm<typeof slaPolicySchema>({
    schema: slaPolicySchema,
    defaultValues: {
      name: '',
      description: null,
      isDefault: false,
    },
    values: policy
      ? {
          name: policy.name ?? '',
          description: policy.description ?? null,
          isDefault: policy.isDefault ?? false,
        }
      : undefined,
    onSubmit: async (values: SlaPolicyFormData) => {
      if (!id) return;
      await updatePolicy.mutateAsync({
        id,
        command: {
          name: values.name.trim(),
          description: values.description?.trim() || null,
          isDefault: values.isDefault,
        },
      });
    },
    invalidateQueryKeys: [
      ['principal-sla-policies', principalId],
      ['principal-sla-policies', principalId, id],
    ],
    toast: { success: 'SLA policy saved', error: 'Save failed' },
  });

  if (isLoading || !policy) {
    return <LoadingSplash />;
  }

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

  const form = detailsForm.form;

  return (
    <DetailPage
      title={policy.name ?? 'Untitled SLA Policy'}
      breadcrumbsKey="principal.sla-policies.detail"
      breadcrumbsParams={{
        principalId: principalId!,
        principalName: principal?.name ?? PendingCrumb,
        id: id!,
        name: policy.name ?? PendingCrumb,
      }}
      documentTitle={policy.name ? `SLA Policy: ${policy.name}` : undefined}
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

            <form.Field name="isDefault">
              {field => (
                <BaseCheckbox
                  isSelected={field.state.value}
                  onValueChange={field.handleChange}
                >
                  Set as default policy
                </BaseCheckbox>
              )}
            </form.Field>
          </form>
        </div>
      </DetailPage.Tab>
    </DetailPage>
  );
}

export default withAuthenticationRequired(PrincipalSlaPolicyDetailPage, {
  OnRedirecting: () => <AuthSplash />,
});
