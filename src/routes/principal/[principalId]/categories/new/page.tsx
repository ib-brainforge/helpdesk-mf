/**
 * Principal category create page — /principal/[principalId]/categories/new
 *
 * W1-P8: Migrated from raw useState form to <FormPage> with useEntityForm.
 */

import { HelpdeskDomainCategoriesEnumsAccessLevel } from '@/api/helpdesk-client';
import { AppAuthSplash } from '@/components/AppSplash';
import { ACCESS_LEVEL_LABELS } from '@/constants/categoryLabels';
import { usePrincipal } from '@/hooks/usePrincipal';
import { useCreatePrincipalCategory } from '@/hooks/usePrincipalCategories';
import {
  BaseInput,
  BaseSelect,
  BaseSelectItem,
} from '@brainforgeau/components';
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

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  accessLevel: z.nativeEnum(HelpdeskDomainCategoriesEnumsAccessLevel),
});

type CategoryFormData = z.infer<typeof categorySchema>;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function PrincipalCategoryNewPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();
  const { data: principal } = usePrincipal(principalId);
  const createMutation = useCreatePrincipalCategory(principalId ?? '');

  const form = useEntityForm<typeof categorySchema>({
    schema: categorySchema,
    defaultValues: {
      name: '',
      description: '',
      accessLevel: HelpdeskDomainCategoriesEnumsAccessLevel.Everyone,
    },
    onSubmit: async (values: CategoryFormData) => {
      await createMutation.mutateAsync({
        name: values.name.trim(),
        description: values.description.trim() || null,
        accessLevel: values.accessLevel,
        sortOrder: 0,
      });
      navigate(`/principal/${principalId}/categories`);
    },
    invalidateQueryKeys: [['principal-categories', principalId]],
    toast: { success: 'Category created', error: 'Create failed' },
  });

  if (context?.level !== 'admin') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-xl font-semibold">Access Denied</p>
        <p className="text-default-500 text-sm">
          Category management requires admin access.
        </p>
      </div>
    );
  }

  const f = form.form;

  return (
    <FormPage
      title="New Category"
      breadcrumbsKey="principal.categories.new"
      breadcrumbsParams={{
        principalId: principalId!,
        principalName: principal?.name ?? PendingCrumb,
      }}
      form={form}
      onCancel={() => navigate(`/principal/${principalId}/categories`)}
    >
      <FormPage.Section title="Category Details" columns={2}>
        <f.Field name="name">
          {field => (
            <BaseInput
              label="Name"
              isRequired
              placeholder="e.g. Technical Support"
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
            />
          )}
        </f.Field>

        <f.Field name="accessLevel">
          {field => (
            <BaseSelect
              label="Access Level"
              selectedKey={field.state.value}
              onSelectionChange={key => {
                if (key)
                  field.handleChange(
                    String(key) as HelpdeskDomainCategoriesEnumsAccessLevel,
                  );
              }}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
            >
              {Object.entries(ACCESS_LEVEL_LABELS).map(([value, label]) => (
                <BaseSelectItem key={value} value={value}>
                  {label}
                </BaseSelectItem>
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
    </FormPage>
  );
}

export default withAuthenticationRequired(PrincipalCategoryNewPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
