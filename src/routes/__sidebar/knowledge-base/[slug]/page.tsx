/**
 * Knowledge base article detail page — /__sidebar/knowledge-base/[slug]
 *
 * W1-P7: Migrated to <DetailPage> with useDetailTabState for ?tab= URL sync.
 * Two read-only tabs: "Article" (content + rating) and "Info" (metadata + related).
 * No form-bearing tabs — no formActions. "Edit Article" is a headerActions button.
 */

import { ScopeApi } from '@/api/helpdesk-client';
import { AppLoadingSplash } from '@/components/AppSplash';
import { EntityMovedScreen } from '@/components/EntityMovedScreen';
import { RelatedArticles } from '@/components/knowledge-base/components/RelatedArticles';
import {
  fetchKnowledgeBaseArticleBySlug,
  useKnowledgeBaseArticle,
  useRateKnowledgeBaseArticle,
} from '@/components/knowledge-base/hooks/useKnowledgeBase';
import { TagChip } from '@/components/tags';
import { useEntityScopeStrip } from '@/hooks/useEntityScopeStrip';
import { useTabSearchParam } from '@/hooks/useTabSearchParam';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  BaseButton,
  BaseCard,
  Icon,
  RecordStrip,
} from '@brainforgeau/components';
import {
  DetailPage,
  PendingCrumb,
  StatusBadge,
  useDetailTabState,
} from '@brainforgeau/components/page';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import { Separator } from '@heroui/react';
import { Link, useNavigate, useParams } from '@modern-js/runtime/router';
import { useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { useState } from 'react';

function KnowledgeBaseArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const timezone = useTimezone();
  const queryClient = useQueryClient();

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

  // Set the moment a post-scope-save refetch comes back 404 -- the save
  // succeeded, but the record just moved (or was already) outside the
  // viewer's current context (DTO tenancy/scope metadata initiative).
  const [articleGoneInfo, setArticleGoneInfo] = useState<{
    destinationName: string | null;
  } | null>(null);

  const { stripProps: scopeStripProps } = useEntityScopeStrip({
    mode: 'detail',
    entityLabel: 'Article',
    meta: article?.meta,
    queryClient,
    queryKey: ['knowledge-base', 'article', slug ?? ''],
    fetchEntity: () => fetchKnowledgeBaseArticleBySlug(slug ?? ''),
    patchScope: async patch => {
      if (!article?.id) return;
      const client = await createHelpdeskApiClient(ScopeApi);
      // entityType verified against helpdesk-backend's `HelpdeskDbContext`
      // (`DbSet<KbArticle> KbArticles`).
      await client.v1ScopeEntityTypeIdPatch('KbArticle', article.id, patch);
    },
    onGone: destinationName => setArticleGoneInfo({ destinationName }),
  });

  if (articleGoneInfo) {
    return (
      <EntityMovedScreen
        entityLabel="Article"
        destinationName={articleGoneInfo.destinationName}
        backHref="/knowledge-base"
        backLabel="Back to Knowledge Base"
      />
    );
  }

  if (isLoading || (!article && !error)) {
    return <AppLoadingSplash />;
  }

  if (error || !article) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <Icon
          name="document-text"
          className="mx-auto h-12 w-12 text-default-400"
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
            color="light"
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
          <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-default-600">
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
              {article.tags.map(tag => (
                <TagChip key={tag} name={tag} />
              ))}
            </div>
          )}

          <Separator className="my-6" />

          {/* Article body — sanitised HTML */}
          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(article.body),
            }}
          />

          <Separator className="my-6" />

          {/* Feedback rating */}
          <div className="rounded bg-default-50 p-6 text-center">
            <h3 className="mb-4 text-lg font-semibold">
              Was this article helpful?
            </h3>
            <div className="flex justify-center gap-8">
              <div className="flex flex-col items-center gap-1">
                <BaseButton
                  color="success"
                  variant="bordered"
                  onPress={() =>
                    article.id &&
                    rateArticle.mutate({
                      articleId: article.id,
                      isHelpful: true,
                    })
                  }
                  isDisabled={rateArticle.isPending}
                  icon={<Icon name="hand-thumb-up" className="h-5 w-5" />}
                >
                  Yes
                </BaseButton>
                <span className="text-xs text-default-500">
                  {article.ratingCount || 0} ratings
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
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
          </div>
        </BaseCard>
      </DetailPage.Tab>

      {/* Info tab — article metadata + related articles. No formActions (read-only). */}
      <DetailPage.Tab id="info" title="Info">
        <RecordStrip {...scopeStripProps} />
        <div className="mt-6 max-w-sm space-y-6">
          <BaseCard>
            <h3 className="mb-3 text-lg font-semibold">Article Info</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Category:</span>{' '}
                <span className="text-default-600">
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
                <span className="text-default-600">
                  {formatDateTime(article.updatedAt, { timezone })}
                </span>
              </div>
              {article.publishedAt && (
                <div>
                  <span className="font-medium">Published:</span>{' '}
                  <span className="text-default-600">
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
