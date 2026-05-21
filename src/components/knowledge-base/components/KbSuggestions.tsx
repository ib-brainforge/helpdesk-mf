import { Icon } from '@brainforgeau/components/base';
import { Link } from '@modern-js/runtime/router';
import type { FC } from 'react';
import { useSimilarArticles } from '../hooks/useKnowledgeBase';
import { BaseCard } from '@brainforgeau/components';

interface KbSuggestionsProps {
  searchText: string;
  minChars?: number;
  limit?: number;
  onArticleClick?: (slug: string) => void;
}

export const KbSuggestions: FC<KbSuggestionsProps> = ({
  searchText,
  minChars = 3,
  limit = 5,
  onArticleClick,
}) => {
  const shouldFetch = searchText.length >= minChars;
  const { data: suggestions, isLoading, isError } = useSimilarArticles(
    shouldFetch ? searchText : '',
    limit
  );

  // If the suggestions call failed, degrade silently — never block the ticket detail view.
  if (isError) {
    return null;
  }

  const hasSuggestions = suggestions && suggestions.length > 0;

  if (!shouldFetch || (!isLoading && !hasSuggestions)) {
    return null;
  }

  return (
    <BaseCard className="mt-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon name="light-bulb" className="text-warning h-5 w-5" />
        <h3 className="text-sm font-semibold">
          Related Knowledge Base Articles
        </h3>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500">Loading suggestions...</div>
      ) : (
        <div className="space-y-2">
          {suggestions?.map((article: any) => (
            <Link
              key={article.id}
              to={`/knowledge-base/${article.slug}`}
              onClick={(e) => {
                if (onArticleClick) {
                  e.preventDefault();
                  onArticleClick(article.slug);
                }
              }}
              className="hover:bg-default-100 block rounded-lg p-3 transition-colors"
            >
              <div className="flex items-start gap-2">
                <Icon
                  name="document-text"
                  className="text-primary mt-0.5 h-4 w-4 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-foreground line-clamp-1 text-sm font-medium">
                    {article.title}
                  </h4>
                  {article.excerpt && (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                      {article.excerpt}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    {article.categoryName && (
                      <span>{article.categoryName}</span>
                    )}
                    {article.relevance && (
                      <span className="text-primary">
                        {Math.round(article.relevance * 100)}% match
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="border-divider mt-3 border-t pt-3 text-xs text-gray-500">
        These articles might help solve your issue before creating a ticket.
      </div>
    </BaseCard>
  );
};
