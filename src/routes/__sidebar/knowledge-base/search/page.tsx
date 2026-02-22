import { useState, useEffect } from 'react';
import { useSearchParams } from '@modern-js/runtime/router';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import { Helmet } from '@modern-js/runtime/head';
import { Card } from '@heroui/react';
import { Icon, BaseInput, BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import { useQuery } from '@tanstack/react-query';
import { KnowledgeBaseApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { useKnowledgeBaseCategories } from '@/components/knowledge-base/hooks/useKnowledgeBase';
import { TagChip } from '@/components/tags';
import DOMPurify from 'dompurify';

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
        selectedCategory ? Number(selectedCategory) : undefined
      );
      return response.data;
    },
    enabled: searchTerm.length >= 3,
  });

  return (
    <>
      <Helmet>
        <title>Search Knowledge Base - {searchTerm}</title>
      </Helmet>

      <div className="mb-5">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold">Search Knowledge Base</h1>
          {searchTerm && (
            <p className="text-gray-600 mt-1">
              Results for: <span className="font-medium">{searchTerm}</span>
            </p>
          )}
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <BaseInput
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            startContent={<Icon name="magnifying-glass" className="h-4 w-4" />}
            className="flex-1"
            autoFocus
          />
          <BaseSelect
            placeholder="All Categories"
            selectedKeys={selectedCategory ? new Set([selectedCategory]) : new Set()}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0] as string;
              setSelectedCategory(key || '');
            }}
            className="w-64"
          >
            {categories?.map((cat) => (
              <BaseSelectItem key={cat.id}>{cat.name}</BaseSelectItem>
            )) || []}
          </BaseSelect>
        </div>

        {/* Search Results */}
        {searchTerm.length < 3 ? (
          <div className="py-12 text-center">
            <Icon name="magnifying-glass" className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-500">Enter at least 3 characters to search</p>
          </div>
        ) : isLoading ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">Searching...</p>
          </div>
        ) : !searchResults || searchResults.items?.length === 0 ? (
          <div className="py-12 text-center">
            <Icon name="document-text" className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-500">No articles found</p>
            <p className="mt-2 text-sm text-gray-400">Try different keywords or categories</p>
          </div>
        ) : (
          <div>
            <div className="mb-4 text-sm text-gray-600">
              Found {searchResults.totalCount || searchResults.items?.length || 0} article(s)
            </div>
            <div className="space-y-4">
              {searchResults.items?.map((article: any) => (
                <Card
                  key={article.id}
                  as="a"
                  href={`/knowledge-base/${article.slug}`}
                  className="p-5 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                        {article.title}
                      </h3>

                      {/* Highlighted snippet from search */}
                      {article.highlight && (
                        <div
                          className="text-sm text-gray-700 mb-3 line-clamp-3"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(article.highlight),
                          }}
                        />
                      )}

                      {/* Excerpt fallback */}
                      {!article.highlight && article.excerpt && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                          {article.excerpt}
                        </p>
                      )}

                      {/* Tags */}
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {article.tags.slice(0, 5).map((tag: string) => (
                            <TagChip key={tag} name={tag} size="sm" />
                          ))}
                          {article.tags.length > 5 && (
                            <span className="text-xs text-gray-500">
                              +{article.tags.length - 5} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {article.categoryName && (
                          <span className="flex items-center gap-1">
                            <Icon name="folder" className="h-3 w-3" />
                            {article.categoryName}
                          </span>
                        )}
                        {article.publishedAt && (
                          <span className="flex items-center gap-1">
                            <Icon name="calendar" className="h-3 w-3" />
                            {formatDateTime(article.publishedAt, { timezone })}
                          </span>
                        )}
                        {article.relevance && (
                          <span className="flex items-center gap-1 text-primary">
                            <Icon name="star" className="h-3 w-3" />
                            {Math.round(article.relevance * 100)}% match
                          </span>
                        )}
                      </div>
                    </div>

                    <Icon
                      name="arrow-right"
                      className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1"
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default KnowledgeBaseSearchPage;
