import { type FC, useMemo } from 'react';
import { Card } from '@heroui/react';
import { Icon } from '@brainforgeau/components/base';
import { useSimilarArticles } from '../hooks/useKnowledgeBase';

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
  const { data: suggestions, isLoading } = useSimilarArticles(
    shouldFetch ? searchText : '',
    limit
  );

  const hasSuggestions = suggestions && suggestions.length > 0;

  if (!shouldFetch || (!isLoading && !hasSuggestions)) {
    return null;
  }

  return (
    <Card className="p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="light-bulb" className="h-5 w-5 text-warning" />
        <h3 className="text-sm font-semibold">Related Knowledge Base Articles</h3>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500">Loading suggestions...</div>
      ) : (
        <div className="space-y-2">
          {suggestions?.map((article: any) => (
            <a
              key={article.id}
              href={`/knowledge-base/${article.slug}`}
              onClick={(e) => {
                if (onArticleClick) {
                  e.preventDefault();
                  onArticleClick(article.slug);
                }
              }}
              className="block p-3 rounded-lg hover:bg-default-100 transition-colors"
            >
              <div className="flex items-start gap-2">
                <Icon name="document-text" className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground line-clamp-1">
                    {article.title}
                  </h4>
                  {article.excerpt && (
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1">{article.excerpt}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    {article.categoryName && <span>{article.categoryName}</span>}
                    {article.relevance && (
                      <span className="text-primary">
                        {Math.round(article.relevance * 100)}% match
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-divider">
        These articles might help solve your issue before creating a ticket.
      </div>
    </Card>
  );
};
