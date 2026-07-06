/**
 * New knowledge-base article page — /__sidebar/knowledge-base/new
 *
 * W1-P8: Migrated to <FormPage> with useEntityForm.
 * Article fields (title, body, categoryId, accessLevel, status) are managed
 * via useEntityForm. After creation the user is redirected to the edit page
 * for the newly-created article (following existing navigation logic).
 *
 * Note: The create API does not accept a `status` field — articles always
 * start as Draft. The status field is included for UI consistency and is
 * sent to the update endpoint if the user changes it immediately after
 * creation (not in scope here).
 */

import {
  useCreateKnowledgeBaseArticle,
  useKnowledgeBaseCategories,
} from '@/components/knowledge-base/hooks/useKnowledgeBase';
import { KnowledgeBaseAccessLevel, KnowledgeBaseStatus } from '@/types';
import {
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  PageSpinner,
} from '@brainforgeau/components';
import { FormPage, useEntityForm } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useNavigate } from '@modern-js/runtime/router';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const newArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Body is required'),
  categoryId: z.string().optional(),
  accessLevel: z.nativeEnum(KnowledgeBaseAccessLevel),
});

type NewArticleFormData = z.infer<typeof newArticleSchema>;

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------

const ACCESS_LEVEL_LABELS: Record<KnowledgeBaseAccessLevel, string> = {
  [KnowledgeBaseAccessLevel.Public]: 'Public',
  [KnowledgeBaseAccessLevel.Authenticated]: 'Authenticated',
  [KnowledgeBaseAccessLevel.TechOnly]: 'Tech Only',
  [KnowledgeBaseAccessLevel.AdminOnly]: 'Admin Only',
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function NewKnowledgeBaseArticlePage() {
  const navigate = useNavigate();
  const createArticle = useCreateKnowledgeBaseArticle();
  const { data: categories } = useKnowledgeBaseCategories();

  const form = useEntityForm<typeof newArticleSchema>({
    schema: newArticleSchema,
    defaultValues: {
      title: '',
      body: '',
      categoryId: undefined,
      accessLevel: KnowledgeBaseAccessLevel.Public,
    },
    onSubmit: async (values: NewArticleFormData) => {
      const result: any = await createArticle.mutateAsync({
        title: values.title,
        body: values.body,
        categoryId: values.categoryId,
        accessLevel: values.accessLevel,
        status: KnowledgeBaseStatus.Draft,
        tags: [],
      });

      if (result?.slug) {
        navigate(`/knowledge-base/${result.slug}/edit`);
      } else {
        navigate('/knowledge-base');
      }
    },
    invalidateQueryKeys: [['knowledge-base', 'articles']],
    toast: { success: 'Article created', error: 'Create failed' },
  });

  const f = form.form;

  return (
    <FormPage
      title="Create New Article"
      breadcrumbsKey="knowledge-base.new"
      form={form}
      onCancel={() => navigate('/knowledge-base')}
    >
      <FormPage.Section title="Article Details" columns={2}>
        <f.Field name="title">
          {field => (
            <BaseInput
              label="Title"
              isRequired
              placeholder="Article title"
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
              className="md:col-span-2"
            />
          )}
        </f.Field>

        <f.Field name="categoryId">
          {field => (
            <BaseSelect
              label="Category"
              selectedKey={field.state.value ?? null}
              onSelectionChange={key => {
                field.handleChange(key ? String(key) : undefined);
              }}
            >
              {(categories ?? []).map(cat => (
                <BaseSelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </BaseSelectItem>
              ))}
            </BaseSelect>
          )}
        </f.Field>

        <f.Field name="accessLevel">
          {field => (
            <BaseSelect
              label="Access Level"
              selectedKey={field.state.value}
              onSelectionChange={key => {
                if (key)
                  field.handleChange(String(key) as KnowledgeBaseAccessLevel);
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
      </FormPage.Section>

      <FormPage.Section title="Content">
        <f.Field name="body">
          {field => (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                Body <span className="text-danger">*</span>
              </label>
              {/* REVIEW: TipTap rich-text editor is intentionally kept as a
                   plain textarea here because TipTap's onChange → handleChange
                   integration requires a controlled wrapper. A future PR should
                   swap this textarea for the <TipTapEditor> component. */}
              <textarea
                className="w-full rounded-lg border border-default-300 bg-default-100 p-3 font-mono text-sm min-h-[400px] focus:outline-none focus:ring-2 focus:ring-primary"
                value={field.state.value}
                onChange={e => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="Write your article content here..."
                aria-invalid={field.state.meta.errors.length > 0}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-danger">
                  {field.state.meta.errors.map(String).join(', ')}
                </p>
              )}
            </div>
          )}
        </f.Field>
      </FormPage.Section>
    </FormPage>
  );
}

export default withAuthenticationRequired(NewKnowledgeBaseArticlePage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
