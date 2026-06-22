import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { BaseCard } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { KnowledgeBaseApi } from '@brainforgeau/helpdesk-client';
import { Link } from '@modern-js/runtime/router';
import { useQuery } from '@tanstack/react-query';
import type { FC } from 'react';

interface RelatedArticlesProps {
  articleIds?: string[];
  currentArticleId: string;
  title?: string;
}

export const RelatedArticles: FC<RelatedArticlesProps> = ({
  articleIds,
  currentArticleId,
  title = 'Related Articles',
}) => {
  const { data: relatedArticles, isLoading } = useQuery({
    queryKey: ['knowledge-base', 'related', articleIds],
    queryFn: async () => {
      if (!articleIds || articleIds.length === 0) return [];

      const client = await createHelpdeskApiClient(KnowledgeBaseApi);

      // Fetch each related article
      const promises = articleIds
        .filter((id) => id !== currentArticleId)
        .slice(0, 5)
        .map((id) => client.v1KbArticlesIdGet(id));

      const results = await Promise.allSettled(promises);

      return results
        .filter(
          (result): result is PromiseFulfilledResult<any> =>
            result.status === 'fulfilled'
        )
        .map((result) => result.value.data);
    },
    enabled: !!articleIds && articleIds.length > 0,
  });

  if (isLoading) {
    return (
      <BaseCard>
        <h3 className="mb-3 text-lg font-semibold">{title}</h3>
        <p className="text-sm text-default-500">Loading...</p>
      </BaseCard>
    );
  }

  if (!relatedArticles || relatedArticles.length === 0) {
    return null;
  }

  return (
    <BaseCard>
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      <div className="space-y-3">
        {relatedArticles.map((article: any) => (
          <Link
            key={article.id}
            to={`/knowledge-base/${article.slug}`}
            className="hover:bg-default-100 block rounded-lg p-2 transition-colors"
          >
            <div className="flex items-start gap-2">
              <Icon
                name="doc"
                className="text-primary mt-0.5 h-4 w-4 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="line-clamp-2 text-sm font-medium">
                  {article.title}
                </h4>
                {article.categoryName && (
                  <p className="mt-1 text-xs text-default-500">
                    {article.categoryName}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </BaseCard>
  );
};
