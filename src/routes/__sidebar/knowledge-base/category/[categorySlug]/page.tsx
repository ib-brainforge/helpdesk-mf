import { useKnowledgeBaseCategories } from '@/components/knowledge-base/hooks/useKnowledgeBase';
import { TagChip } from '@/components/tags';
import { useTimezone } from '@/security';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { KnowledgeBaseStatus } from '@/types';
import { BaseCard, BaseInput, Icon } from '@brainforgeau/components';
import {
  PageBody,
  PageHeader,
  PendingCrumb,
} from '@brainforgeau/components/page';
import { formatDateTime } from '@brainforgeau/components/utils';
import { KnowledgeBaseApi } from '@brainforgeau/helpdesk-client';
import { Chip } from '@heroui/react';
import { Link, useParams } from '@modern-js/runtime/router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

function KnowledgeBaseCategoryPage() {
  const { categorySlug } = useParams();
  const timezone = useTimezone();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: categories } = useKnowledgeBaseCategories();

  // Find category by slug
  const category = categories?.find(cat => cat.slug === categorySlug);

  // Fetch articles in this category
  const { data: articles, isLoading } = useQuery({
    queryKey: [
      'knowledge-base',
      'articles',
      'category',
      category?.id,
      searchTerm,
    ],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbArticlesGet(
        category?.id,
        undefined,
        undefined,
        undefined,
        undefined,
      );
      return response.data;
    },
    enabled: !!category?.id,
  });

  const getStatusColor = (
    status: KnowledgeBaseStatus,
  ): 'default' | 'success' | 'warning' => {
    switch (status) {
      case KnowledgeBaseStatus.Published:
        return 'success';
      case KnowledgeBaseStatus.Draft:
        return 'warning';
      case KnowledgeBaseStatus.Archived:
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: KnowledgeBaseStatus): string => {
    switch (status) {
      case KnowledgeBaseStatus.Published:
        return 'Published';
      case KnowledgeBaseStatus.Draft:
        return 'Draft';
      case KnowledgeBaseStatus.Archived:
        return 'Archived';
      default:
        return 'Unknown';
    }
  };

  if (!category && !isLoading) {
    return (
      <PageBody>
        <div className="py-12 text-center">
          <Icon name="folder" className="mx-auto h-12 w-12 text-default-400" />
          <p className="mt-4 text-default-500">Category not found</p>
        </div>
      </PageBody>
    );
  }

  return (
    <PageBody>
      <PageHeader
        title={category?.name ?? 'Category'}
        breadcrumbsKey="knowledge-base.category"
        breadcrumbsParams={{
          categorySlug: categorySlug ?? '',
          categoryName: category ? category.name : PendingCrumb,
        }}
        documentTitle={
          category ? `${category.name} – Knowledge Base` : 'Knowledge Base'
        }
      >
        {category?.description && (
          <PageHeader.Meta>{category.description}</PageHeader.Meta>
        )}
      </PageHeader>

      {/* Article count */}
      <p className="mb-6 text-sm text-default-500">
        {category?.articleCount || 0} article(s) in this category
      </p>

      {/* Search within category */}
      <div className="mb-6">
        <BaseInput
          placeholder="Search in this category..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          startContent={<Icon name="magnifying-glass" className="h-4 w-4" />}
        />
      </div>

      {/* Articles List */}
      {isLoading ? (
        <div className="py-12 text-center">
          <p className="text-default-500">Loading articles...</p>
        </div>
      ) : !articles || articles.items?.length === 0 ? (
        <div className="py-12 text-center">
          <Icon
            name="document-text"
            className="mx-auto h-12 w-12 text-default-400"
          />
          <p className="mt-4 text-default-500">
            No articles found in this category
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {articles.items?.map((article: any) => (
            <Link
              key={article.id}
              to={`/knowledge-base/${article.slug}`}
              className="block"
            >
              <BaseCard className="cursor-pointer transition-shadow hover:shadow-lg">
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="line-clamp-2 text-lg font-semibold">
                    {article.title}
                  </h3>
                  <Chip size="sm" color={getStatusColor(article.status)}>
                    {getStatusLabel(article.status)}
                  </Chip>
                </div>
                <p className="mb-3 line-clamp-3 text-sm text-default-600">
                  {article.excerpt}
                </p>
                <div className="mb-3 flex flex-wrap gap-1">
                  {article.tags?.slice(0, 3).map((tag: string) => (
                    <TagChip key={tag} name={tag} size="sm" />
                  ))}
                  {article.tags?.length > 3 && (
                    <span className="text-xs text-default-500">
                      +{article.tags.length - 3} more
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-default-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Icon name="eye" className="h-3 w-3" />
                      {article.views}
                    </span>
                    {article.averageRating !== undefined && (
                      <span className="flex items-center gap-1">
                        <Icon name="star" className="h-3 w-3" />
                        {article.averageRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {article.publishedAt && (
                    <span>
                      {formatDateTime(article.publishedAt, { timezone })}
                    </span>
                  )}
                </div>
              </BaseCard>
            </Link>
          ))}
        </div>
      )}
    </PageBody>
  );
}

export default KnowledgeBaseCategoryPage;
