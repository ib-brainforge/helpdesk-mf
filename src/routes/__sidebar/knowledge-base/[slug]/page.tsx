import { useParams } from '@modern-js/runtime/router';
import { Helmet } from '@modern-js/runtime/head';
import { Card, Divider } from '@heroui/react';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { useKnowledgeBaseArticle, useRateKnowledgeBaseArticle } from '@/components/knowledge-base/hooks/useKnowledgeBase';
import { TagChip } from '@/components/tags';
import DOMPurify from 'dompurify';
import { RelatedArticles } from '@/components/knowledge-base/components/RelatedArticles';

function KnowledgeBaseArticlePage() {
  const { slug } = useParams();
  const { data: article, isLoading } = useKnowledgeBaseArticle(slug || '');
  const rateArticle = useRateKnowledgeBaseArticle();

  const handleRating = (isHelpful: boolean) => {
    if (article?.id) {
      rateArticle.mutate({ articleId: article.id, isHelpful });
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Loading article...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="py-12 text-center">
        <Icon name="document-text" className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-gray-500">Article not found</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{article.title} - Knowledge Base</title>
      </Helmet>

      <div className="mb-5">
        <div className="mb-4 flex items-center justify-between">
          <BaseButton
            variant="light"
            size="sm"
            as="a"
            href="/knowledge-base"
            icon={<Icon name="arrow-left" className="h-4 w-4" />}
          >
            Back to Knowledge Base
          </BaseButton>
          <BaseButton
            variant="bordered"
            size="sm"
            as="a"
            href={`/knowledge-base/${slug}/edit`}
            icon={<Icon name="pencil" className="h-4 w-4" />}
          >
            Edit Article
          </BaseButton>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h1 className="mb-4 text-3xl font-bold">{article.title}</h1>

              <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Icon name="user" className="h-4 w-4" />
                  {article.authorName || 'Unknown'}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="calendar" className="h-4 w-4" />
                  {new Date(article.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="eye" className="h-4 w-4" />
                  {article.views} views
                </span>
                {article.averageRating !== undefined && (
                  <span className="flex items-center gap-1">
                    <Icon name="star" className="h-4 w-4" />
                    {article.averageRating.toFixed(1)} ({article.ratingCount} ratings)
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

              <Divider className="my-6" />

              {/* Article Body - HTML rendered */}
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.body) }}
              />

              <Divider className="my-6" />

              {/* Rating Section */}
              <div className="rounded bg-gray-50 p-6 text-center">
                <h3 className="mb-4 text-lg font-semibold">Was this article helpful?</h3>
                <div className="flex justify-center gap-4">
                  <BaseButton
                    color="success"
                    variant="bordered"
                    onPress={() => handleRating(true)}
                    isLoading={rateArticle.isPending}
                    icon={<Icon name="hand-thumb-up" className="h-5 w-5" />}
                  >
                    Yes ({article.ratingCount || 0})
                  </BaseButton>
                  <BaseButton
                    color="danger"
                    variant="bordered"
                    onPress={() => handleRating(false)}
                    isLoading={rateArticle.isPending}
                    icon={<Icon name="hand-thumb-down" className="h-5 w-5" />}
                  >
                    No
                  </BaseButton>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Article Info */}
            <Card className="p-4">
              <h3 className="mb-3 text-lg font-semibold">Article Info</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Category:</span>{' '}
                  <span className="text-gray-600">{article.categoryName || 'Uncategorized'}</span>
                </div>
                <div>
                  <span className="font-medium">Status:</span>{' '}
                  <span className="text-gray-600">{article.status}</span>
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span>{' '}
                  <span className="text-gray-600">
                    {new Date(article.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                {article.publishedAt && (
                  <div>
                    <span className="font-medium">Published:</span>{' '}
                    <span className="text-gray-600">
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Related Articles */}
            {article.relatedArticleIds && article.relatedArticleIds.length > 0 && (
              <RelatedArticles
                articleIds={article.relatedArticleIds}
                currentArticleId={article.id}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default KnowledgeBaseArticlePage;
