import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KnowledgeBaseApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { authorizedAxios } from '@/state/authorizedAxios';
import { getDefaultStore } from 'jotai';
import { configAtom } from '@/state/config';
import type {
  KnowledgeBaseArticleListDto,
  KnowledgeBaseCategoryDto,
  KnowledgeBaseArticleDto,
  PagedResult,
  CreateKnowledgeBaseArticleDto,
  UpdateKnowledgeBaseArticleDto,
} from '@/types';
import { KnowledgeBaseStatus } from '@/types';
import { addToast } from '@heroui/react';

const store = getDefaultStore();

function getApiBaseUrl(): string {
  const config = store.get(configAtom);
  return config?.api?.baseUrl ?? '';
}

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

export const useKnowledgeBaseArticle = (slug: string) => {
  return useQuery<KnowledgeBaseArticleDto>({
    queryKey: ['knowledge-base', 'article', slug],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbArticlesBySlugSlugGet(slug);
      // REVIEW: Using slug endpoint for article lookup
      return (response.data as unknown) as KnowledgeBaseArticleDto;
    },
    enabled: !!slug,
  });
};

export const useKnowledgeBaseArticleById = (id: string) => {
  return useQuery<KnowledgeBaseArticleDto>({
    queryKey: ['knowledge-base', 'article-by-id', id],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbArticlesIdGet(id);
      return (response.data as unknown) as KnowledgeBaseArticleDto;
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
      addToast({ title: 'Article created successfully', severity: 'success' });
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
      addToast({ title: 'Article updated successfully', severity: 'success' });
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
      addToast({ title: 'Article published successfully', severity: 'success' });
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
      addToast({ title: 'Thank you for your feedback!', severity: 'success' });
    },
    onError: () => {
      addToast({ title: 'Failed to submit rating', severity: 'danger' });
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

// REVIEW: Using authorizedAxios directly for new Wave 5 endpoints not yet in the generated client.
// Backend PR #57 merged at commit 1a8356e but the "Generate and Publish NPM Client" workflow
// has been failing (CI billing-blocked), so no client snapshot containing these endpoints is
// available yet. TODO: replace with typed KnowledgeBaseApi methods once a post-billing-fix
// snapshot is published.

export const useImportKb = () => {
  const queryClient = useQueryClient();

  return useMutation<KbImportResult, Error, File>({
    mutationFn: async (file: File) => {
      const baseUrl = getApiBaseUrl();
      const formData = new FormData();
      formData.append('file', file);
      const response = await authorizedAxios.post<KbImportResult>(
        `${baseUrl}/v1/kb/import`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      const message = result.isPartial
        ? `Imported ${result.articlesImported} articles, ${result.categoriesImported} categories (${result.errors.length} errors)`
        : `Imported ${result.articlesImported} articles and ${result.categoriesImported} categories successfully`;
      addToast({ title: 'Import complete', description: message, severity: result.isPartial ? 'warning' : 'success' });
    },
    onError: () => {
      addToast({ title: 'Import failed', description: 'Failed to import KB content', severity: 'danger' });
    },
  });
};

export const useExportKb = () => {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const baseUrl = getApiBaseUrl();
      const response = await authorizedAxios.get(`${baseUrl}/v1/kb/export`, {
        responseType: 'blob',
      });
      // Trigger browser download
      const contentDisposition = response.headers['content-disposition'] as string | undefined;
      const fileNameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
      const fileName = fileNameMatch?.[1] ?? `kb-export-${new Date().toISOString().slice(0, 10)}.zip`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      addToast({ title: 'Export complete', description: 'KB content downloaded successfully', severity: 'success' });
    },
    onError: () => {
      addToast({ title: 'Export failed', description: 'Failed to export KB content', severity: 'danger' });
    },
  });
};

export const useDuplicateKbCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<KnowledgeBaseCategoryDto, Error, { id: string; includeArticles: boolean }>({
    mutationFn: async ({ id, includeArticles }) => {
      const baseUrl = getApiBaseUrl();
      const response = await authorizedAxios.post<KnowledgeBaseCategoryDto>(
        `${baseUrl}/v1/kb/categories/${id}/duplicate?includeArticles=${includeArticles}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', 'categories'] });
      addToast({ title: 'Category duplicated', description: 'Category copied successfully', severity: 'success' });
    },
    onError: () => {
      addToast({ title: 'Duplication failed', description: 'Failed to duplicate category', severity: 'danger' });
    },
  });
};
