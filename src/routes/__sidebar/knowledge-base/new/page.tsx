import { Helmet } from '@modern-js/runtime/head';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { KnowledgeBaseArticleEditorForm } from '@/components/knowledge-base';
import { Breadcrumbs } from '@/components/Breadcrumbs';

function NewKnowledgeBaseArticlePage() {
  return (
    <>
      <Helmet>
        <title>Create New Article</title>
      </Helmet>

      <div className="mb-5">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Knowledge Base', href: '/knowledge-base' },
            { label: 'Create New Article', href: '/knowledge-base/new', isCurrent: true },
          ]}
        />

        <KnowledgeBaseArticleEditorForm mode="create" />
      </div>
    </>
  );
}

export default withAuthenticationRequired(NewKnowledgeBaseArticlePage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
