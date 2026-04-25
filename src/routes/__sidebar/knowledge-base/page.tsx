import { useState } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { Link } from '@modern-js/runtime/router';
import { Icon, BaseInput } from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import {
  useKnowledgeBaseArticles,
  useKnowledgeBaseCategories,
  useExportKb,
} from '@/components/knowledge-base/hooks/useKnowledgeBase';
import { KbArticleListView } from '@/components/knowledge-base/components/KbArticleListView';
import { NewArticleModal } from '@/components/knowledge-base/components/NewArticleModal';
import { KbImportModal } from '@/components/knowledge-base/components/KbImportModal';

function KnowledgeBasePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const { data: categories, isLoading: loadingCategories } = useKnowledgeBaseCategories();
  const { data: articles, isLoading: loadingArticles } = useKnowledgeBaseArticles(
    '',
    searchTerm,
  );
  const exportMutation = useExportKb();

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
            <Link to="/knowledge-base/new">
              <BaseButton
                color="primary"
                icon={<Icon name="plus" className="h-4 w-4" />}
              >
                Create Article
              </BaseButton>
            </Link>
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
                <DropdownItem key="import" onPress={() => setIsImportOpen(true)}>
                  Import
                </DropdownItem>
                <DropdownItem
                  key="export"
                  onPress={() => exportMutation.mutate()}
                >
                  {exportMutation.isPending ? 'Exporting...' : 'Export'}
                </DropdownItem>
                <DropdownItem key="categories" href="/knowledge-base/settings">
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

      {/* Import Modal */}
      <KbImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </>
  );
}

export default KnowledgeBasePage;
