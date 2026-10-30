import { KnowledgeBaseApi } from '@/api/helpdesk-client';
import { useKnowledgeBaseCategories } from '@/components/knowledge-base/hooks/useKnowledgeBase';
import { TagChip } from '@/components/tags';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  BaseCard,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  Icon,
} from '@brainforgeau/components';
import {
  EmptyState,
  PageBody,
  PageHeader,
} from '@brainforgeau/components/page';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import { Link, useSearchParams } from '@modern-js/runtime/router';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { useEffect, useState } from 'react';

function KnowledgeBaseSearchPage() {
  const timezone = useTimezone();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  const { data: categories } = useKnowledgeBaseCategories();

  // Update search params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (selectedCategory) params.set('category', selectedCategory);
    setSearchParams(params);
  }, [searchTerm, selectedCategory, setSearchParams]);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['knowledge-base', 'search', searchTerm, selectedCategory],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbArticlesSearchGet(
        searchTerm,
        selectedCategory ? Number(selectedCategory) : undefined,
      );
      return response.data;
    },
    enabled: searchTerm.length >= 3,
  });

  return (
    <PageBody>
      <PageHeader
        title="Search Knowledge Base"
        breadcrumbsKey="knowledge-base.search"
        documentTitle={
          searchTerm ? `Search: ${searchTerm}` : 'Search Knowledge Base'
        }
      >
        {searchTerm && (
          <PageHeader.Meta>
            Results for: <span className="font-medium">{searchTerm}</span>
          </PageHeader.Meta>
        )}
      </PageHeader>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <BaseInput
          placeholder="Search articles..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          startContent={<Icon name="magnifying-glass" className="h-4 w-4" />}
          className="flex-1"
          autoFocus
        />
        <BaseSelect
          placeholder="All Categories"
          selectedKey={selectedCategory ? selectedCategory : null}
          onSelectionChange={keys => {
            const key = keys as string;
            setSelectedCategory(key || '');
          }}
          className="w-64"
        >
          {categories?.map(cat => (
            <BaseSelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </BaseSelectItem>
          )) || []}
        </BaseSelect>
      </div>

      {/* Search Results */}
      {searchTerm.length < 3 ? (
        <div className="py-12 text-center">
          <Icon
            name="magnifying-glass"
            className="mx-auto h-12 w-12 text-default-400"
          />
          <p className="mt-4 text-default-500">
            Enter at least 3 characters to search
          </p>
        </div>
      ) : isLoading ? (
        <div className="py-12 text-center">
          <p className="text-default-500">Searching...</p>
        </div>
      ) : !searchResults || searchResults.items?.length === 0 ? (
        <EmptyState
          title="No articles found"
          description="Try different keywords or categories."
          live
        />
      ) : (
        <div>
          <div className="mb-4 text-sm text-default-600">
            Found {searchResults.totalCount || searchResults.items?.length || 0}{' '}
            article(s)
          </div>
          <div className="space-y-4">
            {searchResults.items?.map((article: any) => (
              <Link
                key={article.id}
                to={`/knowledge-base/${article.slug}`}
                className="block"
              >
                <BaseCard className="cursor-pointer p-5 transition-shadow hover:shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-2 line-clamp-2 text-lg font-semibold">
                        {article.title}
                      </h3>

                      {/* Highlighted snippet from search */}
                      {article.highlight && (
                        <div
                          className="mb-3 line-clamp-3 text-sm text-default-700"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(article.highlight),
                          }}
                        />
                      )}

                      {/* Excerpt fallback */}
                      {!article.highlight && article.excerpt && (
                        <p className="mb-3 line-clamp-3 text-sm text-default-600">
                          {article.excerpt}
                        </p>
                      )}

                      {/* Tags */}
                      {article.tags && article.tags.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1">
                          {article.tags.slice(0, 5).map((tag: string) => (
                            <TagChip key={tag} name={tag} size="sm" />
                          ))}
                          {article.tags.length > 5 && (
                            <span className="text-xs text-default-500">
                              +{article.tags.length - 5} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-default-500">
                        {article.categoryName && (
                          <span className="flex items-center gap-1">
                            <Icon name="folder" className="h-3 w-3" />
                            {article.categoryName}
                          </span>
                        )}
                        {article.publishedAt && (
                          <span className="flex items-center gap-1">
                            <Icon name="calendar" className="h-3 w-3" />
                            {formatDateTime(article.publishedAt, {
                              timezone,
                            })}
                          </span>
                        )}
                        {article.relevance && (
                          <span className="text-primary flex items-center gap-1">
                            <Icon name="star" className="h-3 w-3" />
                            {Math.round(article.relevance * 100)}% match
                          </span>
                        )}
                      </div>
                    </div>

                    <Icon
                      name="arrow-right"
                      className="mt-1 h-5 w-5 flex-shrink-0 text-default-400"
                    />
                  </div>
                </BaseCard>
              </Link>
            ))}
          </div>
        </div>
      )}
    </PageBody>
  );
}

export default KnowledgeBaseSearchPage;
