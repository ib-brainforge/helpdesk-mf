import { KbArticleListView } from '@/components/knowledge-base/components/KbArticleListView';
import { KbImportModal } from '@/components/knowledge-base/components/KbImportModal';
import { NewArticleModal } from '@/components/knowledge-base/components/NewArticleModal';
import {
  useExportKb,
  useKnowledgeBaseArticles,
  useKnowledgeBaseCategories,
} from '@/components/knowledge-base/hooks/useKnowledgeBase';
import { BaseInput, Icon } from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { PageBody, PageHeader } from '@brainforgeau/components/page';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
} from '@heroui/react';
import { Link } from '@modern-js/runtime/router';
import { useState } from 'react';

function KnowledgeBasePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const { data: categories, isLoading: loadingCategories } =
    useKnowledgeBaseCategories();
  const {
    data: articles,
    isLoading: loadingArticles,
    refetch: refetchArticles,
  } = useKnowledgeBaseArticles('', searchTerm);
  const exportMutation = useExportKb();

  return (
    // h-full + min-h-0 so the article table can grow to the bottom of the
    // viewport instead of collapsing to its content height. PageBody's default
    // classes are `flex w-0 min-w-full flex-col p-5 md:py-5` with no height, so
    // without this the table's internal scroller sizes to a few rows and the
    // list appears cut off with empty space beneath it. min-h-0 is required
    // because a flex child defaults to min-height:auto and would otherwise
    // refuse to shrink, pushing the scrollbar onto the page instead of the table.
    <PageBody className="h-full min-h-0">
      <PageHeader title="Knowledge Base" breadcrumbsKey="knowledge-base.list">
        <PageHeader.Actions>
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
              <BaseButton variant="bordered" isIconOnly>
                <Icon name="dotsV" className="h-4 w-4" />
              </BaseButton>
            </DropdownTrigger>
            <DropdownPopover className="helpdesk-dropdown-popover">
              <DropdownMenu aria-label="Knowledge base actions">
                <DropdownItem
                  key="import"
                  onPress={() => setIsImportOpen(true)}
                >
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
            </DropdownPopover>
          </Dropdown>
        </PageHeader.Actions>
      </PageHeader>

      {/* Search Bar */}
      <div className="mb-6">
        <BaseInput
          placeholder="Search articles..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          startContent={<Icon name="magnifying-glass" className="h-4 w-4" />}
          className="max-w-md"
        />
      </div>

      {/* Article List View */}
      <KbArticleListView
        articles={articles?.items || []}
        categories={categories || []}
        isLoading={loadingArticles}
        refetch={async () => {
          await refetchArticles();
        }}
      />

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
    </PageBody>
  );
}

export default KnowledgeBasePage;
