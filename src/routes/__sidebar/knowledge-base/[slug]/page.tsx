/**
 * Knowledge base article detail page — /__sidebar/knowledge-base/[slug]
 *
 * W1-P7: Migrated to <DetailPage> with useDetailTabState for ?tab= URL sync.
 * Two read-only tabs: "Article" (content + rating) and "Info" (metadata + related).
 * No form-bearing tabs — no formActions. "Edit Article" is a headerActions button.
 */

import { RelatedArticles } from '@/components/knowledge-base/components/RelatedArticles';
import {
  useKnowledgeBaseArticle,
  useRateKnowledgeBaseArticle,
} from '@/components/knowledge-base/hooks/useKnowledgeBase';
import { TagChip } from '@/components/tags';
import { useTabSearchParam } from '@/hooks/useTabSearchParam';
import {
  BaseButton,
  BaseCard,
  Icon,
  PageSpinner,
} from '@brainforgeau/components';
import {
  DetailPage,
  PendingCrumb,
  StatusBadge,
  useDetailTabState,
} from '@brainforgeau/components/page';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import { Card, Separator } from '@heroui/react';
import { Link, useNavigate, useParams } from '@modern-js/runtime/router';
import DOMPurify from 'dompurify';

function KnowledgeBaseArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const timezone = useTimezone();

  const {
    data: article,
    isLoading,
    error,
  } = useKnowledgeBaseArticle(slug ?? '');
  const rateArticle = useRateKnowledgeBaseArticle();

  const { getParam, setParam } = useTabSearchParam();
  const { activeTab, setActiveTab } = useDetailTabState({
    defaultTab: 'article',
    getParam,
    setParam,
  });

  if (isLoading || (!article && !error)) {
    return <PageSpinner title="Loading article..." />;
  }

  if (error || !article) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <Icon
          name="document-text"
          className="mx-auto h-12 w-12 text-gray-400"
        />
        <p className="text-xl font-semibold">Article not found</p>
        <BaseButton variant="light" onPress={() => navigate('/knowledge-base')}>
          Back to Knowledge Base
        </BaseButton>
      </div>
    );
  }

  return (
    <DetailPage
      title={article.title}
      breadcrumbsKey="knowledge-base.article"
      breadcrumbsParams={{
        slug: slug!,
        title: article.title ?? PendingCrumb,
      }}
      documentTitle={`${article.title} – Knowledge Base`}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerActions={
        <Link to={`/knowledge-base/${slug}/edit`}>
          <BaseButton
            variant="bordered"
            size="sm"
            icon={<Icon name="pencil" className="h-4 w-4" />}
          >
            Edit Article
          </BaseButton>
        </Link>
      }
    >
      {/* Article tab — main content + rating. No formActions (read-only). */}
      <DetailPage.Tab id="article" title="Article">
        <BaseCard>
          <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Icon name="user" className="h-4 w-4" />
              {article.authorName || 'Author unavailable'}
            </span>
            <span className="flex items-center gap-1">
              <Icon name="calendar" className="h-4 w-4" />
              {formatDateTime(article.createdAt, { timezone })}
            </span>
            <span className="flex items-center gap-1">
              <Icon name="eye" className="h-4 w-4" />
              {article.views} views
            </span>
            {article.averageRating !== undefined && (
              <span className="flex items-center gap-1">
                <Icon name="star" className="h-4 w-4" />
                {article.averageRating.toFixed(1)} ({article.ratingCount}{' '}
                ratings)
              </span>
            )}
          </div>

          {article.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <TagChip key={tag} name={tag} />
              ))}
            </div>
          )}

          <Separator className="my-6" />

          {/* Article body — sanitised HTML */}
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(article.body),
            }}
          />

          <Separator className="my-6" />

          {/* Feedback rating */}
          <div className="rounded bg-gray-50 p-6 text-center">
            <h3 className="mb-4 text-lg font-semibold">
              Was this article helpful?
            </h3>
            <div className="flex justify-center gap-4">
              <BaseButton
                color="success"
                variant="bordered"
                onPress={() =>
                  article.id &&
                  rateArticle.mutate({ articleId: article.id, isHelpful: true })
                }
                isDisabled={rateArticle.isPending}
                icon={<Icon name="hand-thumb-up" className="h-5 w-5" />}
              >
                Yes ({article.ratingCount || 0})
              </BaseButton>
              <BaseButton
                color="danger"
                variant="bordered"
                onPress={() =>
                  article.id &&
                  rateArticle.mutate({
                    articleId: article.id,
                    isHelpful: false,
                  })
                }
                isDisabled={rateArticle.isPending}
                icon={<Icon name="hand-thumb-down" className="h-5 w-5" />}
              >
                No
              </BaseButton>
            </div>
          </div>
        </BaseCard>
      </DetailPage.Tab>

      {/* Info tab — article metadata + related articles. No formActions (read-only). */}
      <DetailPage.Tab id="info" title="Info">
        <div className="max-w-sm space-y-6">
          <BaseCard>
            <h3 className="mb-3 text-lg font-semibold">Article Info</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Category:</span>{' '}
                <span className="text-gray-600">
                  {article.categoryName || 'Uncategorized'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>{' '}
                <StatusBadge
                  domain="knowledge-base.status"
                  status={article.status}
                  size="sm"
                />
              </div>
              <div>
                <span className="font-medium">Last Updated:</span>{' '}
                <span className="text-gray-600">
                  {formatDateTime(article.updatedAt, { timezone })}
                </span>
              </div>
              {article.publishedAt && (
                <div>
                  <span className="font-medium">Published:</span>{' '}
                  <span className="text-gray-600">
                    {formatDateTime(article.publishedAt, { timezone })}
                  </span>
                </div>
              )}
            </div>
          </BaseCard>

          {article.relatedArticleIds &&
            article.relatedArticleIds.length > 0 && (
              <RelatedArticles
                articleIds={article.relatedArticleIds}
                currentArticleId={article.id}
              />
            )}
        </div>
      </DetailPage.Tab>
    </DetailPage>
  );
}

export default KnowledgeBaseArticlePage;
