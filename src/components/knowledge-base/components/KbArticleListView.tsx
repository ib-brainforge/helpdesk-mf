import { Icon } from '@brainforgeau/components/base';
import { Chip } from '@heroui/react';
import type { KnowledgeBaseArticleListDto } from '@/types';
import { KnowledgeBaseStatus } from '@/types';

type KbArticleListViewProps = {
  articles: KnowledgeBaseArticleListDto[];
  categories: { id: string; name: string; articleCount: number }[];
  isLoading?: boolean;
};

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

export function KbArticleListView({ articles, categories, isLoading }: KbArticleListViewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-default-500">Loading articles...</span>
      </div>
    );
  }

  // Group articles by category
  const articlesByCategory = new Map<string, KnowledgeBaseArticleListDto[]>();

  articles.forEach((article) => {
    const categoryName = article.categoryName || 'Uncategorized';
    if (!articlesByCategory.has(categoryName)) {
      articlesByCategory.set(categoryName, []);
    }
    articlesByCategory.get(categoryName)!.push(article);
  });

  // If no articles, show empty state
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-lg">
        <Icon name="document-text" className="h-12 w-12 text-default-300 mb-3" />
        <p className="text-default-500 mb-1">No articles found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(articlesByCategory.entries()).map(([categoryName, categoryArticles]) => {
        const category = categories.find((c) => c.name === categoryName);
        const articleCount = categoryArticles.length;

        return (
          <div key={categoryName} className="border rounded-lg overflow-hidden">
            {/* Category Header */}
            <div className="bg-default-50 px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="folder" className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-default-700">{categoryName}</h3>
                <Chip size="sm" variant="flat" color="default">
                  {articleCount}
                </Chip>
              </div>
              <a
                href={`/knowledge-base/category/${category?.id || 'uncategorized'}`}
                className="text-sm text-primary hover:underline"
              >
                View all
              </a>
            </div>

            {/* Article List */}
            <div className="divide-y">
              {categoryArticles.slice(0, 5).map((article) => (
                <div
                  key={article.id}
                  className="px-4 py-3 hover:bg-default-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <a
                      href={`/knowledge-base/${article.slug}`}
                      className="flex-1 text-primary hover:underline font-medium"
                    >
                      {article.title}
                    </a>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={getStatusColor(article.status)}
                    >
                      {getStatusLabel(article.status)}
                    </Chip>
                    <span className="text-sm text-default-500">
                      {article.createdAt ? new Date(article.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
