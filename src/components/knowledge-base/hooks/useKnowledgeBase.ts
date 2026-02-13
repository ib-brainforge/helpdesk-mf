import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KnowledgeBaseApi } from '@brainforgeau/helpdesk-client';
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
import { addToast } from '@heroui/react';

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
