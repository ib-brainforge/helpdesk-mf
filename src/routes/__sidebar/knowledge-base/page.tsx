import { useState } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { Icon, BaseInput } from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, addToast } from '@heroui/react';
import { useKnowledgeBaseArticles, useKnowledgeBaseCategories } from '@/components/knowledge-base/hooks/useKnowledgeBase';
import { KbArticleListView } from '@/components/knowledge-base/components/KbArticleListView';
import { NewArticleModal } from '@/components/knowledge-base/components/NewArticleModal';

function KnowledgeBasePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

  const { data: categories, isLoading: loadingCategories } = useKnowledgeBaseCategories();
  const { data: articles, isLoading: loadingArticles } = useKnowledgeBaseArticles(
    '',
    searchTerm,
  );

  const handleComingSoon = (feature: string) => {
    addToast({
      title: 'Coming soon',
      description: `${feature} will be available soon`,
      severity: 'warning',
    });
  };

  return (
    <>
      <Helmet>
        <title>Knowledge Base</title>
      </Helmet>

      <div className="mb-5">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Knowledge Base</h1>
          <div className="flex items-center gap-2">
            <BaseButton
              variant="bordered"
              onPress={() => setIsQuickCreateOpen(true)}
              icon={<Icon name="plus" className="h-4 w-4" />}
            >
              Quick Create
            </BaseButton>
            <BaseButton
              color="primary"
              icon={<Icon name="plus" className="h-4 w-4" />}
              as="a"
              href="/knowledge-base/new"
            >
              Create Article
            </BaseButton>
            <Dropdown>
              <DropdownTrigger>
                <BaseButton
                  variant="bordered"
                  isIconOnly
                >
                  <Icon name="dotsV" className="h-4 w-4" />
                </BaseButton>
              </DropdownTrigger>
              <DropdownMenu aria-label="Knowledge base actions">
                <DropdownItem key="import" onPress={() => handleComingSoon('Import')}>
                  Import
                </DropdownItem>
                <DropdownItem key="export" onPress={() => handleComingSoon('Export')}>
                  Export
                </DropdownItem>
                <DropdownItem key="categories" onPress={() => handleComingSoon('Manage Categories')}>
                  Manage Categories
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
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

      {/* Quick Create Modal */}
      <NewArticleModal
        isOpen={isQuickCreateOpen}
        onClose={() => setIsQuickCreateOpen(false)}
      />
    </>
  );
}

export default KnowledgeBasePage;
