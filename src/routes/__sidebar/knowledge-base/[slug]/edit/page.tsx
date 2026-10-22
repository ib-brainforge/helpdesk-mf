/**
 * Knowledge-base article edit page — /__sidebar/knowledge-base/[slug]/edit
 *
 * W1-P8: Migrated to <FormPage> using useEntityForm with `values:` controlled
 * re-initialization so the form fields populate when the article query settles.
 *
 * This is an edit (not a create) so:
 *  - Query fetches the existing article by slug.
 *  - `values` prop on useEntityForm re-initializes the form when data arrives.
 *  - Cancel navigates back to the article view.
 *
 * NET-114 follow-up fix: `values` object is memoized so its reference identity
 * only changes when actual article field values change. Without useMemo, a new
 * object literal is created on every render (including those triggered by
 * onSelectionChange itself), causing useEntityForm to call form.reset() on the
 * very next tick and clobber every select change before it registers as dirty.
 */

import { AppAuthSplash, AppLoadingSplash } from '@/components/AppSplash';
import {
  useArchiveKnowledgeBaseArticle,
  useKnowledgeBaseArticle,
  useKnowledgeBaseCategories,
  usePublishKnowledgeBaseArticle,
  useUnpublishKnowledgeBaseArticle,
  useUpdateKnowledgeBaseArticle,
} from '@/components/knowledge-base/hooks/useKnowledgeBase';
import { KnowledgeBaseAccessLevel, KnowledgeBaseStatus } from '@/types';
import {
  BaseButton,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
} from '@brainforgeau/components';
import {
  EmptyState,
  FormPage,
  useEntityForm,
} from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useNavigate, useParams } from '@modern-js/runtime/router';
import { useMemo } from 'react';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const articleEditSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Body is required'),
  categoryId: z.string().optional(),
  accessLevel: z.nativeEnum(KnowledgeBaseAccessLevel),
  status: z.nativeEnum(KnowledgeBaseStatus),
});

type ArticleEditFormData = z.infer<typeof articleEditSchema>;

// ---------------------------------------------------------------------------
// Access level + status options
// ---------------------------------------------------------------------------

const ACCESS_LEVEL_LABELS: Record<KnowledgeBaseAccessLevel, string> = {
  [KnowledgeBaseAccessLevel.Public]: 'Public',
  [KnowledgeBaseAccessLevel.Authenticated]: 'Authenticated',
  [KnowledgeBaseAccessLevel.TechOnly]: 'Tech Only',
  [KnowledgeBaseAccessLevel.AdminOnly]: 'Admin Only',
};

const STATUS_LABELS: Record<KnowledgeBaseStatus, string> = {
  [KnowledgeBaseStatus.Draft]: 'Draft',
  [KnowledgeBaseStatus.Published]: 'Published',
  [KnowledgeBaseStatus.Archived]: 'Archived',
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function EditKnowledgeBaseArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: article, isLoading, error } = useKnowledgeBaseArticle(slug!);
  const { data: categories } = useKnowledgeBaseCategories();
  const updateArticle = useUpdateKnowledgeBaseArticle();
  const publishArticle = usePublishKnowledgeBaseArticle();
  const unpublishArticle = useUnpublishKnowledgeBaseArticle();
  const archiveArticle = useArchiveKnowledgeBaseArticle();

  // Stable reference: only a new object is created when article field values
  // actually change (identity based on primitive fields, not the article object
  // reference). Without this memo, useEntityForm's prevValuesRef check sees a
  // new object on every render and calls form.reset(), clobbering user edits.
  const formValues = useMemo(
    () =>
      article
        ? {
            title: article.title ?? '',
            body: article.body ?? '',
            categoryId: article.categoryId ?? undefined,
            accessLevel: article.accessLevel ?? KnowledgeBaseAccessLevel.Public,
            status: article.status ?? KnowledgeBaseStatus.Draft,
          }
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      article?.title,
      article?.body,
      article?.categoryId,
      article?.accessLevel,
      article?.status,
    ],
  );

  const form = useEntityForm<typeof articleEditSchema>({
    schema: articleEditSchema,
    // defaultValues must track formValues (not be a static empty object).
    // useEntityForm calls form.reset(values) when the controlled `values` prop
    // changes, which updates TanStack Form's internal defaultValues.  On the
    // very next React render TanStack Form calls form.update() with the
    // defaultValues from this useForm() call; if that is still the static
    // empty-string object and isTouched is false (just reset), the form is
    // immediately wiped back to empty fields (NET-117).  By mirroring
    // formValues here, both sides of the comparison always agree and the
    // wipe path is never triggered.
    defaultValues: formValues ?? {
      title: '',
      body: '',
      categoryId: undefined,
      accessLevel: KnowledgeBaseAccessLevel.Public,
      status: KnowledgeBaseStatus.Draft,
    },
    values: formValues,
    onSubmit: async (values: ArticleEditFormData) => {
      if (!article?.id) return;

      // Save content fields — status is NOT sent in the update command.
      await updateArticle.mutateAsync({
        id: article.id,
        updates: {
          title: values.title,
          body: values.body,
          categoryId: values.categoryId,
          accessLevel: values.accessLevel,
        },
      });

      // Apply status transition if changed.
      const previousStatus = article.status ?? KnowledgeBaseStatus.Draft;
      if (values.status !== previousStatus) {
        if (values.status === KnowledgeBaseStatus.Published) {
          await publishArticle.mutateAsync(article.id);
        } else if (values.status === KnowledgeBaseStatus.Draft) {
          await unpublishArticle.mutateAsync(article.id);
        } else if (values.status === KnowledgeBaseStatus.Archived) {
          await archiveArticle.mutateAsync(article.id);
        }
      }
    },
    invalidateQueryKeys: [
      ['knowledge-base', 'article', slug],
      ['knowledge-base', 'articles'],
    ],
    toast: { success: 'Article saved', error: 'Save failed' },
  });

  if (isLoading) {
    return <AppLoadingSplash />;
  }

  if (error || !article) {
    return (
      <EmptyState
        title="Article not found"
        description="The article you're looking for does not exist or has been removed."
        action={
          <BaseButton onPress={() => navigate('/knowledge-base')}>
            Back to Knowledge Base
          </BaseButton>
        }
      />
    );
  }

  const f = form.form;

  return (
    <FormPage
      title={`Edit: ${article.title}`}
      breadcrumbsKey="knowledge-base.article.edit"
      breadcrumbsParams={{
        slug: slug!,
        title: article.title ?? '',
      }}
      form={form}
      onCancel={() => navigate(`/knowledge-base/${slug}`)}
    >
      <FormPage.Section title="Article Details" columns={2}>
        <f.Field name="title">
          {field => (
            <BaseInput
              label="Title"
              isRequired
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
              placeholder="Article title"
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

        <f.Field name="status">
          {field => (
            <BaseSelect
              label="Status"
              selectedKey={field.state.value}
              onSelectionChange={key => {
                if (key) field.handleChange(String(key) as KnowledgeBaseStatus);
              }}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
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

export default withAuthenticationRequired(EditKnowledgeBaseArticlePage, {
  OnRedirecting: () => <AppAuthSplash />,
});
