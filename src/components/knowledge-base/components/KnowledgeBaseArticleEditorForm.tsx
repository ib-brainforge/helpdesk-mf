import { type FC, useCallback, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { useNavigate } from '@modern-js/runtime/router';
import {
  BaseButton,
  BaseInput,
  BaseTextarea,
  BaseSelect,
  BaseSelectItem,
  Icon,
} from '@brainforgeau/components';
import { addToast } from '@heroui/react';
import {
  useCreateKnowledgeBaseArticle,
  useUpdateKnowledgeBaseArticle,
  usePublishKnowledgeBaseArticle,
  useKnowledgeBaseCategories,
} from '../hooks/useKnowledgeBase';
import {
  KnowledgeBaseStatus,
  KnowledgeBaseAccessLevel,
  type KnowledgeBaseArticleDto,
  type CreateKnowledgeBaseArticleDto,
  type UpdateKnowledgeBaseArticleDto,
} from '@/types';

const articleFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Body is required'),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  accessLevel: z.nativeEnum(KnowledgeBaseAccessLevel),
  status: z.nativeEnum(KnowledgeBaseStatus),
});

type ArticleFormData = z.infer<typeof articleFormSchema>;

interface KnowledgeBaseArticleEditorFormProps {
  article?: KnowledgeBaseArticleDto;
  mode: 'create' | 'edit';
}

const ACCESS_LEVEL_OPTIONS = [
  { id: KnowledgeBaseAccessLevel.Public, name: 'Public', description: 'Visible to everyone' },
  { id: KnowledgeBaseAccessLevel.Internal, name: 'Internal', description: 'Visible to authenticated users' },
  { id: KnowledgeBaseAccessLevel.Private, name: 'Private', description: 'Visible to admins only' },
];

const STATUS_OPTIONS = [
  { id: KnowledgeBaseStatus.Draft, name: 'Draft', description: 'Not published yet' },
  { id: KnowledgeBaseStatus.Published, name: 'Published', description: 'Publicly available' },
  { id: KnowledgeBaseStatus.Archived, name: 'Archived', description: 'No longer active' },
];

export const KnowledgeBaseArticleEditorForm: FC<KnowledgeBaseArticleEditorFormProps> = ({ article, mode }) => {
  const navigate = useNavigate();
  const createArticleMutation = useCreateKnowledgeBaseArticle();
  const updateArticleMutation = useUpdateKnowledgeBaseArticle();
  const publishArticleMutation = usePublishKnowledgeBaseArticle();
  const { data: categories } = useKnowledgeBaseCategories();

  const [currentStatus, setCurrentStatus] = useState(article?.status ?? KnowledgeBaseStatus.Draft);

  const form = useForm({
    defaultValues: {
      title: article?.title || '',
      body: article?.body || '',
      categoryId: article?.categoryId || undefined,
      tags: article?.tags || [],
      accessLevel: article?.accessLevel ?? KnowledgeBaseAccessLevel.Public,
      status: article?.status ?? KnowledgeBaseStatus.Draft,
    } as ArticleFormData,
    validators: {
      onChange: articleFormSchema,
      onSubmit: articleFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        if (mode === 'create') {
          const createDto: CreateKnowledgeBaseArticleDto = {
            title: value.title,
            body: value.body,
            categoryId: value.categoryId,
            tags: value.tags,
            accessLevel: value.accessLevel,
            status: value.status,
          };

          const result: any = await createArticleMutation.mutateAsync(createDto);

          if (result?.slug) {
            navigate(`/knowledge-base/${result.slug}/edit`);
          } else if (result?.id) {
            navigate(`/knowledge-base`);
          } else {
            navigate('/knowledge-base');
          }
        } else if (article?.id) {
          const updateDto: UpdateKnowledgeBaseArticleDto = {
            title: value.title,
            body: value.body,
            categoryId: value.categoryId,
            tags: value.tags,
            accessLevel: value.accessLevel,
            status: value.status,
          };

          await updateArticleMutation.mutateAsync({ id: article.id, updates: updateDto });
          setCurrentStatus(value.status);
        }
      } catch (error) {
        // REVIEW: Error handled by global axios interceptor
        console.error('Failed to save article:', error);
      }
    },
  });

  const handlePublish = useCallback(async () => {
    if (!article?.id) return;

    try {
      await publishArticleMutation.mutateAsync(article.id);
      setCurrentStatus(KnowledgeBaseStatus.Published);
      // Update form field
      form.setFieldValue('status', KnowledgeBaseStatus.Published);
    } catch (error) {
      console.error('Failed to publish article:', error);
    }
  }, [article?.id, publishArticleMutation, form]);

  const handleCancel = useCallback(() => {
    navigate('/knowledge-base');
  }, [navigate]);

  const handleViewArticle = useCallback(() => {
    if (article?.slug) {
      navigate(`/knowledge-base/${article.slug}`);
    }
  }, [article?.slug, navigate]);

  const formatFormErrors = (errors: any[]): string | undefined => {
    if (!errors || errors.length === 0) return undefined;
    return errors.map(e => (typeof e === 'string' ? e : e.message || String(e))).join(', ');
  };

  const isLoading = createArticleMutation.isPending || updateArticleMutation.isPending || publishArticleMutation.isPending;
  const isDraft = currentStatus === KnowledgeBaseStatus.Draft;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {mode === 'create' ? 'Create New Article' : `Edit Article: ${article?.title}`}
        </h1>
        {mode === 'edit' && article?.slug && (
          <BaseButton
            variant="bordered"
            size="sm"
            onPress={handleViewArticle}
            icon={<Icon name="eye" className="h-4 w-4" />}
          >
            View Article
          </BaseButton>
        )}
      </div>

      {/* Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        {/* Title & Category */}
        <div className="rounded-lg border p-6 space-y-4">
          <form.Field name="title">
            {(field) => (
              <BaseInput
                label="Article Title"
                isRequired
                placeholder="Enter article title"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                errorMessage={formatFormErrors(field.state.meta.errors)}
                isInvalid={field.state.meta.errors.length > 0}
              />
            )}
          </form.Field>

          <form.Field name="categoryId">
            {(field) => (
              <BaseSelect
                label="Category"
                placeholder="Select a category (optional)"
                selectedKeys={field.state.value ? [field.state.value] : []}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as string | undefined;
                  field.handleChange(value);
                }}
              >
                {categories?.map((category) => (
                  <BaseSelectItem key={category.id}>{category.name}</BaseSelectItem>
                )) || []}
              </BaseSelect>
            )}
          </form.Field>
        </div>

        {/* Article Body */}
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Article Content</h2>
          <form.Field name="body">
            {(field) => (
              <BaseTextarea
                label="Body"
                isRequired
                placeholder="Write your article content here..."
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
                minRows={15}
                errorMessage={formatFormErrors(field.state.meta.errors)}
                isInvalid={field.state.meta.errors.length > 0}
                description="REVIEW: Rich text editor (TipTap) can be added if @tiptap packages are available"
              />
            )}
          </form.Field>
        </div>

        {/* Tags */}
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Tags</h2>
          <form.Field name="tags">
            {(field) => (
              <BaseInput
                label="Tags"
                placeholder="Add tags (comma-separated)"
                value={field.state.value?.join(', ') ?? ''}
                onChange={(e) => {
                  const tags = e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter((t) => t.length > 0);
                  field.handleChange(tags);
                }}
                description="Tags help users find this article"
              />
            )}
          </form.Field>
        </div>

        {/* Settings */}
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Article Settings</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field name="accessLevel">
              {(field) => (
                <BaseSelect
                  label="Access Level"
                  isRequired
                  selectedKeys={[String(field.state.value)]}
                  onSelectionChange={(keys) => {
                    const newValue = Number(keys.currentKey) as KnowledgeBaseAccessLevel;
                    field.handleChange(newValue);
                  }}
                  errorMessage={formatFormErrors(field.state.meta.errors)}
                  isInvalid={field.state.meta.errors.length > 0}
                >
                  {ACCESS_LEVEL_OPTIONS.map((level) => (
                    <BaseSelectItem key={String(level.id)} textValue={level.name}>
                      <div className="flex flex-col">
                        <span className="font-medium">{level.name}</span>
                        <span className="text-xs text-default-400">{level.description}</span>
                      </div>
                    </BaseSelectItem>
                  ))}
                </BaseSelect>
              )}
            </form.Field>

            <form.Field name="status">
              {(field) => (
                <BaseSelect
                  label="Status"
                  isRequired
                  selectedKeys={[String(field.state.value)]}
                  onSelectionChange={(keys) => {
                    const newValue = Number(keys.currentKey) as KnowledgeBaseStatus;
                    field.handleChange(newValue);
                    setCurrentStatus(newValue);
                  }}
                  errorMessage={formatFormErrors(field.state.meta.errors)}
                  isInvalid={field.state.meta.errors.length > 0}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <BaseSelectItem key={String(status.id)} textValue={status.name}>
                      <div className="flex flex-col">
                        <span className="font-medium">{status.name}</span>
                        <span className="text-xs text-default-400">{status.description}</span>
                      </div>
                    </BaseSelectItem>
                  ))}
                </BaseSelect>
              )}
            </form.Field>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <BaseButton variant="bordered" onPress={handleCancel} isDisabled={isLoading}>
            Cancel
          </BaseButton>

          <div className="flex items-center gap-3">
            {mode === 'edit' && isDraft && (
              <BaseButton
                color="success"
                onPress={handlePublish}
                isLoading={publishArticleMutation.isPending}
                icon={<Icon name="check-circle" className="h-4 w-4" />}
              >
                Publish
              </BaseButton>
            )}
            <BaseButton
              type="submit"
              color="primary"
              isLoading={createArticleMutation.isPending || updateArticleMutation.isPending}
              icon={<Icon name="check" className="h-4 w-4" />}
            >
              {mode === 'create' ? 'Create Article' : 'Save Changes'}
            </BaseButton>
          </div>
        </div>
      </form>
    </div>
  );
};
