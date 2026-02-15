import { useState } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { Icon, BaseInput } from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { useKnowledgeBaseArticles, useKnowledgeBaseCategories } from '@/components/knowledge-base/hooks/useKnowledgeBase';
import { KbArticleListView } from '@/components/knowledge-base/components/KbArticleListView';

function KnowledgeBasePage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: categories, isLoading: loadingCategories } = useKnowledgeBaseCategories();
  const { data: articles, isLoading: loadingArticles } = useKnowledgeBaseArticles(
    '',
    searchTerm,
  );

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

        {/* Search Bar */}
        <div className="mb-6">
          <BaseInput
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            startContent={<Icon name="magnifying-glass" className="h-4 w-4" />}
            className="max-w-md"
          />
        </div>

        {/* Article List View */}
        <KbArticleListView
          articles={articles?.items || []}
          categories={categories || []}
          isLoading={loadingArticles}
        />
      </div>
    </>
  );
}

export default KnowledgeBasePage;
