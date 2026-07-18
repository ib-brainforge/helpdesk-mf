/**
 * Principal category detail page — /principal/[principalId]/categories/[id]
 *
 * W1-P7: Migrated to <DetailPage> with useDetailTabState for ?tab= URL sync.
 * Single "details" tab is form-bearing; formActions wired to that tab only.
 */

import { ACCESS_LEVEL_LABELS } from '@/constants/categoryLabels';
import { usePrincipal } from '@/hooks/usePrincipal';
import {
  usePrincipalCategory,
  useUpdatePrincipalCategory,
} from '@/hooks/usePrincipalCategories';
import { useTabSearchParam } from '@/hooks/useTabSearchParam';
import {
  AuthSplash,
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
import { HelpdeskDomainCategoriesEnumsAccessLevel } from '@brainforgeau/helpdesk-client';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useOutletContext, useParams } from '@modern-js/runtime/router';
import { z } from 'zod';
import type { PrincipalOutletContext } from '../../layout';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullish(),
  accessLevel: z.nativeEnum(HelpdeskDomainCategoriesEnumsAccessLevel),
});

type CategoryFormData = z.infer<typeof categorySchema>;

function PrincipalCategoryDetailPage() {
  const { principalId, id } = useParams<{ principalId: string; id: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const { data: principal } = usePrincipal(principalId);

  const { data: category, isLoading } = usePrincipalCategory(
    principalId ?? '',
    id ?? '',
  );
  const updateCategory = useUpdatePrincipalCategory(principalId ?? '');

  const { getParam, setParam } = useTabSearchParam();
  const { activeTab, setActiveTab } = useDetailTabState({
    defaultTab: 'details',
    getParam,
    setParam,
  });

  const detailsForm = useEntityForm<typeof categorySchema>({
    schema: categorySchema,
    defaultValues: {
      name: '',
      description: null,
      accessLevel: HelpdeskDomainCategoriesEnumsAccessLevel.Everyone,
    },
    values: category
      ? {
          name: category.name ?? '',
          description: category.description ?? null,
          accessLevel:
            category.accessLevel ??
            HelpdeskDomainCategoriesEnumsAccessLevel.Everyone,
        }
      : undefined,
    onSubmit: async (values: CategoryFormData) => {
      if (!id) return;
      await updateCategory.mutateAsync({
        id,
        command: {
          name: values.name.trim(),
          description: values.description?.trim() || null,
          accessLevel: values.accessLevel,
        },
      });
    },
    invalidateQueryKeys: [
      ['principal-categories', principalId],
      ['principal-categories', principalId, id],
    ],
    toast: { success: 'Category saved', error: 'Save failed' },
  });

  if (isLoading || !category) {
    return <LoadingSplash />;
  }

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

  const form = detailsForm.form;

  return (
    <DetailPage
      title={category.name ?? 'Untitled Category'}
      breadcrumbsKey="principal.categories.detail"
      breadcrumbsParams={{
        principalId: principalId!,
        principalName: principal?.name ?? PendingCrumb,
        id: id!,
        name: category.name ?? PendingCrumb,
      }}
      documentTitle={category.name ? `Category: ${category.name}` : undefined}
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

            <form.Field name="accessLevel">
              {field => (
                <BaseSelect
                  label="Access level"
                  selectedKey={field.state.value}
                  onSelectionChange={key => {
                    if (key)
                      field.handleChange(
                        String(key) as HelpdeskDomainCategoriesEnumsAccessLevel,
                      );
                  }}
                >
                  {Object.entries(ACCESS_LEVEL_LABELS).map(([value, label]) => (
                    <BaseSelectItem key={value} value={value}>
                      {label}
                    </BaseSelectItem>
                  ))}
                </BaseSelect>
              )}
            </form.Field>
          </form>
        </div>
      </DetailPage.Tab>
    </DetailPage>
  );
}

export default withAuthenticationRequired(PrincipalCategoryDetailPage, {
  OnRedirecting: () => <AuthSplash />,
});
