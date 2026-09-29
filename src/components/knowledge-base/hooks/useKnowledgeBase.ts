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
  type HelpdeskApplicationKnowledgeBaseModelsKbCategoryTreeDto,
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

// v1KbCategoriesGet returns a nested tree (KbCategoryTreeDto, with real
// articleCount + children), but the rest of the app (DuplicateCategoryModal,
// the settings page, the category page) consumes a flat list keyed by
// parentId — none of them walk `.children` recursively. Flatten the tree here
// so callers keep working unchanged while picking up real articleCount and
// parentId values (previously hardcoded to 0 / undefined).
function flattenCategoryTree(
  nodes: HelpdeskApplicationKnowledgeBaseModelsKbCategoryTreeDto[],
  parentId?: string,
): KnowledgeBaseCategoryDto[] {
  return nodes.flatMap(node => {
    const flat: KnowledgeBaseCategoryDto = {
      id: node.id ?? '',
      name: node.name ?? '',
      slug: node.slug ?? undefined,
      description: node.description ?? undefined,
      parentId,
      articleCount: node.articleCount ?? 0,
      order: node.sortOrder ?? 0,
      // `meta` intentionally omitted here, not dropped: `node` (the generated
      // HelpdeskApplicationKnowledgeBaseModelsKbCategoryTreeDto backing
      // v1KbCategoriesGet) has no `meta` property to read yet -- see
      // KnowledgeBaseCategoryDto's own doc comment (@/types/knowledge-base)
      // for the pending helpdesk-backend PR. Once that ships and this client
      // regenerates, add `meta: node.meta` here so the scope strip becomes
      // wireable on this screen the same way it already is for Sections.
    };
    const children = node.children
      ? flattenCategoryTree(node.children, flat.id)
      : [];
    return [flat, ...children];
  });
}

export const useKnowledgeBaseCategories = () => {
  return useQuery<KnowledgeBaseCategoryDto[]>({
    queryKey: ['knowledge-base', 'categories'],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbCategoriesGet();
      return flattenCategoryTree(response.data ?? []);
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

/**
 * The article's author, taken from the audit metadata every record carries.
 *
 * WHERE IT WAS HIDING
 * Both mappers used to hardcode `authorId: ''` under a TODO saying the backend
 * did not expose an author, so every article in every environment rendered
 * "Author unavailable". The backend does expose it, and always has: `meta` is
 * the shared RecordMeta envelope, and it carries `createdBy` and `modifiedBy`
 * as `{ userId, name }`. Nothing needed adding server-side, only reading.
 *
 * `createdBy` is null on records written outside the application (a SQL seed,
 * an import), because the audit interceptor only stamps rows that pass through
 * EF. Those articles fall back to the id-less empty string and the page shows
 * its "Author unavailable" text, which is now an accurate statement about that
 * row rather than a blanket default.
 */
function mapAuthor(meta: unknown): { authorId: string; authorName?: string } {
  const createdBy = (meta as { createdBy?: { userId?: string; name?: string } })
    ?.createdBy;
  return {
    authorId: createdBy?.userId ?? '',
    authorName: createdBy?.name ?? undefined,
  };
}

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
    ...mapAuthor(dto.meta),
    createdAt: dto.createdAt ?? new Date().toISOString(),
    updatedAt: dto.modifiedAt ?? dto.createdAt ?? new Date().toISOString(),
    publishedAt: dto.publishedAt ?? undefined,
    meta: dto.meta,
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
    ...mapAuthor(dto.meta),
    createdAt: dto.createdAt ?? new Date().toISOString(),
    updatedAt: dto.modifiedAt ?? dto.createdAt ?? new Date().toISOString(),
    publishedAt: dto.publishedAt ?? undefined,
    relatedArticleIds: [],
    meta: dto.meta,
  };
}

/**
 * Fetches a single article by slug and maps it to the local DTO. Exported
 * (not just the `useKnowledgeBaseArticle` hook below) so
 * `useEntityScopeStrip`'s post-scope-save re-fetch (DTO tenancy/scope
 * metadata initiative -- `/knowledge-base/[slug]/page.tsx`) can call the
 * exact same fetch outside of React Query's hook rules.
 * `incrementViewCount` defaults to `false` for that reason -- a scope-save
 * refetch must not inflate the article's view count the way the page's own
 * initial load (which passes `true`) intentionally does.
 */
export const fetchKnowledgeBaseArticleBySlug = async (
  slug: string,
  incrementViewCount = false,
): Promise<KnowledgeBaseArticleDto> => {
  if (!slug) {
    throw new Error('Article slug is required');
  }
  const client = await createHelpdeskApiClient(KnowledgeBaseApi);
  const response = await client.v1KbArticlesBySlugSlugGet(
    slug,
    incrementViewCount,
  );
  if (!response.data) {
    throw new Error('Article not found');
  }
  return mapKbArticleDetailToDto(response.data);
};

export const useKnowledgeBaseArticle = (slug: string) => {
  return useQuery<KnowledgeBaseArticleDto>({
    queryKey: ['knowledge-base', 'article', slug],
    // Pass incrementViewCount: true so each page visit increments the counter.
    // The backend defaults this param to false which is why views always showed 0.
    queryFn: () => fetchKnowledgeBaseArticleBySlug(slug, true),
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
      return {
        articlesImported: response.data.articlesImported ?? 0,
        categoriesImported: response.data.categoriesImported ?? 0,
        errors: response.data.errors ?? [],
        isPartial: response.data.isPartial ?? false,
      };
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
      const cat = response.data;
      return {
        id: cat.id ?? '',
        name: cat.name ?? '',
        slug: cat.slug ?? undefined,
        description: cat.description ?? undefined,
        parentId: cat.parentId ?? undefined,
        // v1KbCategoriesIdDuplicatePost returns the flat KbCategoryDto, which
        // does not expose articleCount (unlike KbCategoryTreeDto from the list
        // endpoint) — a freshly duplicated category has no count from this
        // response; the list refetch (onSuccess below) will pick up the real
        // count from v1KbCategoriesGet.
        articleCount: 0,
        order: cat.sortOrder ?? 0,
        // Unlike flattenCategoryTree above, KbCategoryDto (this endpoint's
        // response) has always carried `meta` -- carry it through.
        meta: cat.meta,
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
