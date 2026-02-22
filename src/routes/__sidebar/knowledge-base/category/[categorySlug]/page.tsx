import { useParams } from '@modern-js/runtime/router';
import { Helmet } from '@modern-js/runtime/head';
import { Card } from '@heroui/react';
import { Icon, BaseInput } from '@brainforgeau/components';
import { useState } from 'react';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import { useQuery } from '@tanstack/react-query';
import { KnowledgeBaseApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { useKnowledgeBaseCategories } from '@/components/knowledge-base/hooks/useKnowledgeBase';
import { TagChip } from '@/components/tags';
import { KnowledgeBaseStatus } from '@/types';

function KnowledgeBaseCategoryPage() {
  const { categorySlug } = useParams();
  const timezone = useTimezone();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: categories } = useKnowledgeBaseCategories();

  // Find category by slug
  const category = categories?.find((cat) => (cat as any).slug === categorySlug);

  // Fetch articles in this category
  const { data: articles, isLoading } = useQuery({
    queryKey: ['knowledge-base', 'articles', 'category', category?.id, searchTerm],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbArticlesGet(category?.id, undefined, undefined, undefined, undefined);
      return response.data;
    },
    enabled: !!category?.id,
  });

  const getStatusColor = (status: KnowledgeBaseStatus): 'default' | 'success' | 'warning' => {
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
      <div className="py-12 text-center">
        <Icon name="folder" className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-gray-500">Category not found</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{category?.name || 'Category'} - Knowledge Base</title>
      </Helmet>

      <div className="mb-5">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm mb-4">
          <a href="/knowledge-base" className="text-primary hover:underline">
            Knowledge Base
          </a>
          <Icon name="chevron-right" className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">{category?.name}</span>
        </nav>

        {/* Category Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Icon name="folder" className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-semibold">{category?.name}</h1>
          </div>
          {category?.description && (
            <p className="text-gray-600 ml-11">{category.description}</p>
          )}
          <p className="text-sm text-gray-500 ml-11 mt-1">
            {category?.articleCount || 0} article(s) in this category
          </p>
        </div>

        {/* Search within category */}
        <div className="mb-6">
          <BaseInput
            placeholder="Search in this category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            startContent={<Icon name="magnifying-glass" className="h-4 w-4" />}
          />
        </div>

        {/* Articles List */}
        {isLoading ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">Loading articles...</p>
          </div>
        ) : !articles || articles.items?.length === 0 ? (
          <div className="py-12 text-center">
            <Icon name="document-text" className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-500">No articles found in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {articles.items?.map((article: any) => (
              <Card
                key={article.id}
                as="a"
                href={`/knowledge-base/${article.slug}`}
                className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="text-lg font-semibold line-clamp-2">{article.title}</h3>
                  <TagChip
                    name={getStatusLabel(article.status)}
                    color={
                      getStatusColor(article.status) === 'success'
                        ? '#10b981'
                        : getStatusColor(article.status) === 'warning'
                          ? '#f59e0b'
                          : '#6b7280'
                    }
                  />
                </div>
                <p className="mb-3 text-sm text-gray-600 line-clamp-3">{article.excerpt}</p>
                <div className="mb-3 flex flex-wrap gap-1">
                  {article.tags?.slice(0, 3).map((tag: string) => (
                    <TagChip key={tag} name={tag} size="sm" />
                  ))}
                  {article.tags?.length > 3 && (
                    <span className="text-xs text-gray-500">+{article.tags.length - 3} more</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
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
                    <span>{formatDateTime(article.publishedAt, { timezone })}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default KnowledgeBaseCategoryPage;
