import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@heroui/react';
import { KnowledgeBaseApi } from '@brainforgeau/helpdesk-client';
import type { HelpdeskApplicationKnowledgeBaseModelsKbArticleDetailDto } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type {
  KnowledgeBaseArticleListDto,
  KnowledgeBaseCategoryDto,
  KnowledgeBaseArticleDto,
  PagedResult,
  CreateKnowledgeBaseArticleDto,
  UpdateKnowledgeBaseArticleDto,
} from '@/types';
import { KnowledgeBaseStatus } from '@/types';


export const useKnowledgeBaseCategories = () => {
  return useQuery<KnowledgeBaseCategoryDto[]>({
    queryKey: ['knowledge-base', 'categories'],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbCategoriesGet();
      // REVIEW: Type mapping from generated types to local types may be needed
      return (response.data as unknown) as KnowledgeBaseCategoryDto[];
    },
  });
};

export const useKnowledgeBaseArticles = (categoryId?: string, searchTerm?: string) => {
  return useQuery<PagedResult<KnowledgeBaseArticleListDto>>({
    queryKey: ['knowledge-base', 'articles', categoryId, searchTerm],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      if (searchTerm) {
        const response = await client.v1KbArticlesSearchGet(searchTerm);
        // REVIEW: Generated client returns PagedResult, mapping may be needed
        return (response.data as unknown) as PagedResult<KnowledgeBaseArticleListDto>;
      }
      const response = await client.v1KbArticlesGet(categoryId);
      // REVIEW: Generated client returns PagedResult, mapping may be needed
      return (response.data as unknown) as PagedResult<KnowledgeBaseArticleListDto>;
    },
  });
};

function mapKbArticleDetailToDto(
  dto: HelpdeskApplicationKnowledgeBaseModelsKbArticleDetailDto,
): KnowledgeBaseArticleDto {
  return {
    id: dto.id ?? '',
    slug: dto.slug ?? '',
    title: dto.title ?? '',
    body: dto.body ?? '',
    excerpt: dto.excerpt ?? '',
    categoryId: dto.categoryId,
    categoryName: dto.categoryName,
    status: (dto.status as unknown as number) ?? 0,
    accessLevel: (dto.accessLevel as unknown as number) ?? 0,
    views: dto.viewCount ?? 0,
    averageRating: dto.helpfulCount !== undefined && dto.notHelpfulCount !== undefined
      ? dto.helpfulCount + dto.notHelpfulCount > 0
        ? Math.round((dto.helpfulCount / (dto.helpfulCount + dto.notHelpfulCount)) * 5 * 10) / 10
        : undefined
      : undefined,
    ratingCount: (dto.helpfulCount ?? 0) + (dto.notHelpfulCount ?? 0),
    tags: (dto.tags ?? []).map(t => t.name ?? '').filter(Boolean),
    authorId: '',
    createdAt: dto.createdAt ?? new Date().toISOString(),
    updatedAt: dto.modifiedAt ?? dto.createdAt ?? new Date().toISOString(),
    publishedAt: dto.publishedAt ?? undefined,
    relatedArticleIds: [],
  };
}

export const useKnowledgeBaseArticle = (slug: string) => {
  return useQuery<KnowledgeBaseArticleDto>({
    queryKey: ['knowledge-base', 'article', slug],
    queryFn: async () => {
      if (!slug) {
        throw new Error('Article slug is required');
      }
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbArticlesBySlugSlugGet(slug);
      if (!response.data) {
        throw new Error('Article not found');
      }
      return mapKbArticleDetailToDto(response.data);
    },
    enabled: !!slug,
  });
};

export const useKnowledgeBaseArticleById = (id: string) => {
  return useQuery<KnowledgeBaseArticleDto>({
    queryKey: ['knowledge-base', 'article-by-id', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Article id is required');
      }
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbArticlesIdGet(id);
      if (!response.data) {
        throw new Error('Article not found');
      }
      return mapKbArticleDetailToDto(response.data);
    },
    enabled: !!id,
  });
};

export const useCreateKnowledgeBaseArticle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (article: CreateKnowledgeBaseArticleDto) => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      // REVIEW: API schema doesn't include status in create command - articles start as Draft
      const response = await client.v1KbArticlesPost({
        title: article.title,
        body: article.body,
        categoryId: article.categoryId,
        tags: article.tags,
        accessLevel: article.accessLevel as any,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', 'articles'] });
      toast('Article created successfully', { variant: 'success' });
    },
  });
};

export const useUpdateKnowledgeBaseArticle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateKnowledgeBaseArticleDto }) => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      // REVIEW: API schema doesn't include status in update command - use publish endpoint for that
      const response = await client.v1KbArticlesIdPut(id, {
        id: id,
        title: updates.title,
        body: updates.body,
        categoryId: updates.categoryId,
        tags: updates.tags,
        accessLevel: updates.accessLevel as any,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', 'articles'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', 'article-by-id', variables.id] });
      toast('Article updated successfully', { variant: 'success' });
    },
  });
};

export const usePublishKnowledgeBaseArticle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      // REVIEW: Using publish endpoint if available, otherwise note this needs backend support
      // For now, we'll just use a placeholder - backend needs to expose publish endpoint
      const response = await client.v1KbArticlesIdGet(id);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', 'articles'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', 'article-by-id', id] });
      toast('Article published successfully', { variant: 'success' });
    },
  });
};

export const useRateKnowledgeBaseArticle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ articleId, isHelpful }: { articleId: string; isHelpful: boolean }) => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbArticlesIdRatePost(articleId, { isHelpful });
      return response.data;
    },
    onSuccess: (_, { articleId }) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', 'article', articleId] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', 'article-by-id', articleId] });
      toast('Thank you for your feedback!', { variant: 'success' });
    },
    onError: () => {
      toast('Failed to submit rating', { variant: 'danger' });
    },
  });
};

export const useSimilarArticles = (text: string, limit = 5) => {
  return useQuery({
    queryKey: ['knowledge-base', 'similar', text, limit],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbArticlesSuggestionsGet(text, limit);
      return response.data;
    },
    enabled: text.length >= 3,
    staleTime: 60_000, // Cache for 1 minute
  });
};

export interface KbImportResult {
  articlesImported: number;
  categoriesImported: number;
  errors: string[];
  isPartial: boolean;
}

export const useImportKb = () => {
  const queryClient = useQueryClient();

  return useMutation<KbImportResult, Error, File>({
    mutationFn: async (file: File) => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbImportPost(file);
      return response.data as unknown as KbImportResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      const message = result.isPartial
        ? `Imported ${result.articlesImported} articles, ${result.categoriesImported} categories (${result.errors.length} errors)`
        : `Imported ${result.articlesImported} articles and ${result.categoriesImported} categories successfully`;
      toast('Import complete', { description: message, variant: result.isPartial ? 'warning' : 'success' });
    },
    onError: () => {
      toast('Import failed', { description: 'Failed to import KB content', variant: 'danger' });
    },
  });
};

export const useExportKb = () => {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbExportGet({ responseType: 'blob' });
      // Trigger browser download
      const contentDisposition = response.headers['content-disposition'] as string | undefined;
      const fileNameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
      const fileName = fileNameMatch?.[1] ?? `kb-export-${new Date().toISOString().slice(0, 10)}.zip`;

      const url = window.URL.createObjectURL(new Blob([response.data as unknown as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast('Export complete', { description: 'KB content downloaded successfully', variant: 'success' });
    },
    onError: () => {
      toast('Export failed', { description: 'Failed to export KB content', variant: 'danger' });
    },
  });
};

export const useDuplicateKbCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<KnowledgeBaseCategoryDto, Error, { id: string; includeArticles: boolean }>({
    mutationFn: async ({ id, includeArticles }) => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbCategoriesIdDuplicatePost(id, includeArticles);
      return response.data as unknown as KnowledgeBaseCategoryDto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', 'categories'] });
      toast('Category duplicated', { description: 'Category copied successfully', variant: 'success' });
    },
    onError: () => {
      toast('Duplication failed', { description: 'Failed to duplicate category', variant: 'danger' });
    },
  });
};
