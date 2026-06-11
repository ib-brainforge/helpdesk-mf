import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type {
  CreateKnowledgeBaseArticleDto,
  KnowledgeBaseArticleDto,
  KnowledgeBaseArticleListDto,
  KnowledgeBaseCategoryDto,
  PagedResult,
  UpdateKnowledgeBaseArticleDto,
} from '@/types';
import { KnowledgeBaseAccessLevel, KnowledgeBaseStatus } from '@/types';
import {
  type HelpdeskApplicationKnowledgeBaseModelsKbArticleDetailDto,
  type HelpdeskApplicationKnowledgeBaseModelsKbArticleListDto,
  type HelpdeskApplicationKnowledgeBaseModelsKbCategoryDto,
  type HelpdeskDomainKnowledgeBaseEnumsKbArticleAccessLevel,
  type HelpdeskDomainKnowledgeBaseEnumsKbArticleStatus,
  KnowledgeBaseApi,
} from '@brainforgeau/helpdesk-client';
import { toast } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Map a generated KbArticleStatus string to the local KnowledgeBaseStatus string enum.
// The generated type and the local enum share the same string values, so this is a
// safe identity mapping that provides compile-time checking.
function mapStatus(
  status: HelpdeskDomainKnowledgeBaseEnumsKbArticleStatus | undefined,
): KnowledgeBaseStatus {
  switch (status) {
    case 'Published':
      return KnowledgeBaseStatus.Published;
    case 'Archived':
      return KnowledgeBaseStatus.Archived;
    case 'Draft':
    default:
      return KnowledgeBaseStatus.Draft;
  }
}

function mapAccessLevel(
  accessLevel: HelpdeskDomainKnowledgeBaseEnumsKbArticleAccessLevel | undefined,
): KnowledgeBaseAccessLevel {
  switch (accessLevel) {
    case 'Authenticated':
      return KnowledgeBaseAccessLevel.Authenticated;
    case 'TechOnly':
      return KnowledgeBaseAccessLevel.TechOnly;
    case 'AdminOnly':
      return KnowledgeBaseAccessLevel.AdminOnly;
    case 'Public':
    default:
      return KnowledgeBaseAccessLevel.Public;
  }
}

export const useKnowledgeBaseCategories = () => {
  return useQuery<KnowledgeBaseCategoryDto[]>({
    queryKey: ['knowledge-base', 'categories'],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbCategoriesGet();
      const categories =
        response.data as HelpdeskApplicationKnowledgeBaseModelsKbCategoryDto[];
      return categories.map(
        (cat): KnowledgeBaseCategoryDto => ({
          id: cat.id ?? '',
          name: cat.name ?? '',
          description: cat.description ?? undefined,
          parentId: undefined,
          articleCount: 0, // KbCategoryDto does not expose article count — backend does not return this field
          order: cat.sortOrder ?? 0,
        }),
      );
    },
  });
};

export const useKnowledgeBaseArticles = (
  categoryId?: string,
  searchTerm?: string,
) => {
  return useQuery<PagedResult<KnowledgeBaseArticleListDto>>({
    queryKey: ['knowledge-base', 'articles', categoryId, searchTerm],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      if (searchTerm) {
        const response = await client.v1KbArticlesSearchGet(searchTerm);
        const pagedData = response.data as {
          items?: HelpdeskApplicationKnowledgeBaseModelsKbArticleListDto[];
          totalCount?: number;
          page?: number;
          pageSize?: number;
        };
        return {
          items: (pagedData.items ?? []).map(mapKbArticleListToDto),
          totalCount: pagedData.totalCount ?? 0,
          page: pagedData.page ?? 1,
          pageSize: pagedData.pageSize ?? 25,
        };
      }
      const response = await client.v1KbArticlesGet(categoryId);
      const pagedData = response.data as {
        items?: HelpdeskApplicationKnowledgeBaseModelsKbArticleListDto[];
        totalCount?: number;
        page?: number;
        pageSize?: number;
      };
      return {
        items: (pagedData.items ?? []).map(mapKbArticleListToDto),
        totalCount: pagedData.totalCount ?? 0,
        page: pagedData.page ?? 1,
        pageSize: pagedData.pageSize ?? 25,
      };
    },
  });
};

function mapKbArticleListToDto(
  dto: HelpdeskApplicationKnowledgeBaseModelsKbArticleListDto,
): KnowledgeBaseArticleListDto {
  return {
    id: dto.id ?? '',
    slug: dto.slug ?? '',
    title: dto.title ?? '',
    excerpt: dto.excerpt ?? '',
    categoryId: dto.categoryId,
    categoryName: dto.categoryName,
    status: mapStatus(dto.status),
    accessLevel: mapAccessLevel(dto.accessLevel),
    views: dto.viewCount ?? 0,
    averageRating: undefined,
    ratingCount: 0,
    tags: [], // KbArticleListDto does not expose tags — only KbArticleDetailDto has them
    authorId: '',
    createdAt: dto.createdAt ?? new Date().toISOString(),
    updatedAt: dto.modifiedAt ?? dto.createdAt ?? new Date().toISOString(),
    publishedAt: dto.publishedAt ?? undefined,
  };
}

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
    status: mapStatus(dto.status),
    accessLevel: mapAccessLevel(dto.accessLevel),
    views: dto.viewCount ?? 0,
    averageRating:
      dto.helpfulCount !== undefined && dto.notHelpfulCount !== undefined
        ? dto.helpfulCount + dto.notHelpfulCount > 0
          ? Math.round(
              (dto.helpfulCount / (dto.helpfulCount + dto.notHelpfulCount)) *
                5 *
                10,
            ) / 10
          : undefined
        : undefined,
    ratingCount: (dto.helpfulCount ?? 0) + (dto.notHelpfulCount ?? 0),
    tags: [], // KbArticleListDto does not expose tags — only KbArticleDetailDto has them
    // authorName is not returned by KbArticleDetailDto — only authorId would be available
    // if the backend exposed it. For now we omit the field so the UI can show a graceful
    // fallback (e.g. "Author unavailable") rather than a misleading "Unknown".
    // TODO(D25-follow-up): once the backend exposes authorId on KbArticleDetailDto,
    // look up the user display name from the identity service.
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
      // Pass incrementViewCount: true so each page visit increments the counter.
      // The backend defaults this param to false which is why views always showed 0.
      const response = await client.v1KbArticlesBySlugSlugGet(slug, true);
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
      // Note: the create command does not accept a status field — articles always start as Draft.
      const response = await client.v1KbArticlesPost({
        title: article.title,
        body: article.body,
        categoryId: article.categoryId,
        tags: article.tags,
        accessLevel:
          article.accessLevel as HelpdeskDomainKnowledgeBaseEnumsKbArticleAccessLevel,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['knowledge-base', 'articles'],
      });
      // Toast is intentionally omitted here: the new-article page calls this
      // mutation via useEntityForm which emits its own unified toast.
      // A per-mutation toast would produce a duplicate notification (NET-117).
    },
  });
};

export const useUpdateKnowledgeBaseArticle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: { id: string; updates: UpdateKnowledgeBaseArticleDto }) => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      // Note: the update command does not accept a status field — use the publish endpoint for status changes.
      const response = await client.v1KbArticlesIdPut(id, {
        id: id,
        title: updates.title,
        body: updates.body,
        categoryId: updates.categoryId,
        tags: updates.tags,
        accessLevel: updates.accessLevel as
          | HelpdeskDomainKnowledgeBaseEnumsKbArticleAccessLevel
          | undefined,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['knowledge-base', 'articles'],
      });
      queryClient.invalidateQueries({
        queryKey: ['knowledge-base', 'article-by-id', variables.id],
      });
      // Toast is intentionally omitted here: the edit page calls this mutation
      // via useEntityForm which emits its own unified "Article saved" toast.
      // A per-mutation toast would produce duplicate notifications (NET-117).
    },
  });
};

export const usePublishKnowledgeBaseArticle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      await client.v1KbArticlesIdPublishPost(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: ['knowledge-base', 'articles'],
      });
      queryClient.invalidateQueries({
        queryKey: ['knowledge-base', 'article-by-id', id],
      });
      // Toast omitted — useEntityForm on the edit page emits the unified toast (NET-117).
    },
    onError: () => {
      toast('Failed to publish article', { variant: 'danger' });
    },
  });
};

export const useUnpublishKnowledgeBaseArticle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      await client.v1KbArticlesIdUnpublishPost(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: ['knowledge-base', 'articles'],
      });
      queryClient.invalidateQueries({
        queryKey: ['knowledge-base', 'article-by-id', id],
      });
      // Toast omitted — useEntityForm on the edit page emits the unified toast (NET-117).
    },
    onError: () => {
      toast('Failed to unpublish article', { variant: 'danger' });
    },
  });
};

export const useArchiveKnowledgeBaseArticle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      await client.v1KbArticlesIdArchivePost(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: ['knowledge-base', 'articles'],
      });
      queryClient.invalidateQueries({
        queryKey: ['knowledge-base', 'article-by-id', id],
      });
      // Toast omitted — useEntityForm on the edit page emits the unified toast (NET-117).
    },
    onError: () => {
      toast('Failed to archive article', { variant: 'danger' });
    },
  });
};

export const useRateKnowledgeBaseArticle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      articleId,
      isHelpful,
    }: { articleId: string; isHelpful: boolean }) => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbArticlesIdRatePost(articleId, {
        isHelpful,
      });
      return response.data;
    },
    onSuccess: (_, { articleId }) => {
      // Invalidate both slug-based and id-based article caches. The slug-based
      // query key is ['knowledge-base', 'article', slug] and the id-based one is
      // ['knowledge-base', 'article-by-id', articleId]. Using the shared prefix
      // ['knowledge-base', 'article'] ensures both slug and id caches are busted
      // regardless of which key the caller used to fetch the article.
      queryClient.invalidateQueries({
        queryKey: ['knowledge-base', 'article'],
      });
      queryClient.invalidateQueries({
        queryKey: ['knowledge-base', 'article-by-id', articleId],
      });
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
    // Never propagate errors to the React error boundary — a failed suggestions
    // call should silently degrade, not crash the ticket detail page.
    throwOnError: false,
    retry: false,
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
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      const message = result.isPartial
        ? `Imported ${result.articlesImported} articles, ${result.categoriesImported} categories (${result.errors.length} errors)`
        : `Imported ${result.articlesImported} articles and ${result.categoriesImported} categories successfully`;
      toast('Import complete', {
        description: message,
        variant: result.isPartial ? 'warning' : 'success',
      });
    },
    onError: () => {
      toast('Import failed', {
        description: 'Failed to import KB content',
        variant: 'danger',
      });
    },
  });
};

export const useExportKb = () => {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbExportGet({ responseType: 'blob' });
      // Trigger browser download
      const contentDisposition = response.headers['content-disposition'] as
        | string
        | undefined;
      const fileNameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
      const fileName =
        fileNameMatch?.[1] ??
        `kb-export-${new Date().toISOString().slice(0, 10)}.zip`;

      const url = window.URL.createObjectURL(
        new Blob([response.data as unknown as BlobPart]),
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast('Export complete', {
        description: 'KB content downloaded successfully',
        variant: 'success',
      });
    },
    onError: () => {
      toast('Export failed', {
        description: 'Failed to export KB content',
        variant: 'danger',
      });
    },
  });
};

export const useDuplicateKbCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<
    KnowledgeBaseCategoryDto,
    Error,
    { id: string; includeArticles: boolean }
  >({
    mutationFn: async ({ id, includeArticles }) => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbCategoriesIdDuplicatePost(
        id,
        includeArticles,
      );
      const cat =
        response.data as HelpdeskApplicationKnowledgeBaseModelsKbCategoryDto;
      return {
        id: cat.id ?? '',
        name: cat.name ?? '',
        description: cat.description ?? undefined,
        parentId: undefined,
        articleCount: 0, // KbCategoryDto does not expose article count — backend does not return this field
        order: cat.sortOrder ?? 0,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['knowledge-base', 'categories'],
      });
      toast('Category duplicated', {
        description: 'Category copied successfully',
        variant: 'success',
      });
    },
    onError: () => {
      toast('Duplication failed', {
        description: 'Failed to duplicate category',
        variant: 'danger',
      });
    },
  });
};
