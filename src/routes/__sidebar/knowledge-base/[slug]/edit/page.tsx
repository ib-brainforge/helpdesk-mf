import { useParams } from '@modern-js/runtime/router';
import { Helmet } from '@modern-js/runtime/head';
import { Suspense } from 'react';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { KnowledgeBaseArticleEditorForm } from '@/components/knowledge-base';
import { useKnowledgeBaseArticle } from '@/components/knowledge-base/hooks/useKnowledgeBase';
import { Breadcrumbs } from '@/components/Breadcrumbs';

function EditKnowledgeBaseArticlePageContent({ slug }: { slug: string }) {
  const { data: article, isLoading, error } = useKnowledgeBaseArticle(slug);

  if (isLoading) {
    return <PageSpinner title="Loading article..." />;
  }

  if (error || !article) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Icon name="warning" className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Article not found
        </h2>
        <p className="text-muted-foreground mb-4">
          The article you're looking for doesn't exist or has been removed.
        </p>
        <BaseButton href="/knowledge-base" variant="light">
          Back to Knowledge Base
        </BaseButton>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Edit Article - {article.title}</title>
      </Helmet>

      <div className="mb-5">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Knowledge Base', href: '/knowledge-base' },
            { label: article.title, href: `/knowledge-base/${slug}` },
            { label: 'Edit', href: `/knowledge-base/${slug}/edit`, isCurrent: true },
          ]}
        />

        <KnowledgeBaseArticleEditorForm mode="edit" article={article} />
      </div>
    </>
  );
}

function EditKnowledgeBaseArticlePage() {
  const { slug } = useParams();

  if (!slug) {
    return <PageSpinner title="Loading..." />;
  }

  return (
    <Suspense fallback={<PageSpinner title="Loading..." />}>
      <EditKnowledgeBaseArticlePageContent slug={slug} />
    </Suspense>
  );
}

export default withAuthenticationRequired(EditKnowledgeBaseArticlePage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
