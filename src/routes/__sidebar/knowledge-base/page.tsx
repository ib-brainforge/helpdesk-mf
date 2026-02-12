import { useState } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { Input, Select, SelectItem, Card } from '@heroui/react';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { useKnowledgeBaseArticles, useKnowledgeBaseCategories } from '@/components/knowledge-base/hooks/useKnowledgeBase';
import { KnowledgeBaseStatus } from '@/types';
import { TagChip } from '@/components/tags';

function KnowledgeBasePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<KnowledgeBaseStatus | ''>('');

  const { data: categories, isLoading: loadingCategories } = useKnowledgeBaseCategories();
  const { data: articles, isLoading: loadingArticles } = useKnowledgeBaseArticles(
    selectedCategory,
    searchTerm,
  );

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

  return (
    <>
      <Helmet>
        <title>Knowledge Base</title>
      </Helmet>

      <div className="mb-5">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Knowledge Base</h1>
          <BaseButton
            color="primary"
            icon={<Icon name="plus" className="h-4 w-4" />}
            as="a"
            href="/knowledge-base/new"
          >
            Create Article
          </BaseButton>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <Input
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            startContent={<Icon name="magnifying-glass" className="h-4 w-4" />}
            className="flex-1"
          />
          <Select
            placeholder="All Categories"
            selectedKeys={selectedCategory ? [selectedCategory] : []}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0] as string;
              setSelectedCategory(key || '');
            }}
            className="w-64"
          >
            {categories?.map((cat) => (
              <SelectItem key={cat.id}>
                {cat.name}
              </SelectItem>
            )) || []}
          </Select>
          <Select
            placeholder="All Statuses"
            selectedKeys={statusFilter !== '' ? [statusFilter.toString()] : []}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0] as string;
              setStatusFilter(key ? parseInt(key, 10) : '');
            }}
            className="w-48"
          >
            <SelectItem key={KnowledgeBaseStatus.Published.toString()}>
              Published
            </SelectItem>
            <SelectItem key={KnowledgeBaseStatus.Draft.toString()}>
              Draft
            </SelectItem>
            <SelectItem key={KnowledgeBaseStatus.Archived.toString()}>
              Archived
            </SelectItem>
          </Select>
        </div>

        {/* Articles Grid */}
        {loadingArticles ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">Loading articles...</p>
          </div>
        ) : articles?.items.length === 0 ? (
          <div className="py-12 text-center">
            <Icon name="document-text" className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-500">No articles found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {articles?.items.map((article) => (
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
                  {article.tags.slice(0, 3).map((tag) => (
                    <TagChip key={tag} name={tag} size="sm" />
                  ))}
                  {article.tags.length > 3 && (
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
                  <span>{article.categoryName || 'Uncategorized'}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default KnowledgeBasePage;
