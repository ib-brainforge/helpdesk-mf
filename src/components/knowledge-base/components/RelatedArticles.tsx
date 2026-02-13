import { type FC } from 'react';
import { Card } from '@heroui/react';
import { Icon } from '@brainforgeau/components/base';
import { useQuery } from '@tanstack/react-query';
import { KnowledgeBaseApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';

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
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map((result) => result.value.data);
    },
    enabled: !!articleIds && articleIds.length > 0,
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <h3 className="mb-3 text-lg font-semibold">{title}</h3>
        <p className="text-sm text-gray-500">Loading...</p>
      </Card>
    );
  }

  if (!relatedArticles || relatedArticles.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      <div className="space-y-3">
        {relatedArticles.map((article: any) => (
          <a
            key={article.id}
            href={`/knowledge-base/${article.slug}`}
            className="block p-2 rounded-lg hover:bg-default-100 transition-colors"
          >
            <div className="flex items-start gap-2">
              <Icon name="document-text" className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium line-clamp-2">{article.title}</h4>
                {article.categoryName && (
                  <p className="text-xs text-gray-500 mt-1">{article.categoryName}</p>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </Card>
  );
};
