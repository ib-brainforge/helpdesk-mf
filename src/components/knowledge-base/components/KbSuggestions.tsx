import { BaseCard } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { Link } from '@modern-js/runtime/router';
import type { FC } from 'react';
import { useSimilarArticles } from '../hooks/useKnowledgeBase';

/**
 * The match percentage to display, or null when there is nothing worth showing.
 *
 * Null covers both "the search tier did not rank this" (the substring fallback)
 * and "it ranked so low it rounds to zero". Neither is a statement worth
 * printing next to an article the search chose to surface.
 */
const matchPercent = (score: unknown): number | null => {
  if (typeof score !== 'number' || Number.isNaN(score)) return null;
  const percent = Math.round(score * 100);
  return percent > 0 ? percent : null;
};

interface KbSuggestionsProps {
  searchText: string;
  minChars?: number;
  limit?: number;
  onArticleClick?: (slug: string) => void;
  /**
   * Shown instead of nothing when the search returns no articles.
   *
   * Callers that render their own heading above this component need it: with
   * the component returning null, the heading was left standing over empty
   * space and read as something that had failed to load. Omit it where the
   * component is free to disappear entirely.
   */
  emptyMessage?: string;
}

export const KbSuggestions: FC<KbSuggestionsProps> = ({
  searchText,
  minChars = 3,
  limit = 5,
  onArticleClick,
  emptyMessage,
}) => {
  const shouldFetch = searchText.length >= minChars;
  const {
    data: suggestions,
    isLoading,
    isError,
  } = useSimilarArticles(shouldFetch ? searchText : '', limit);

  const hasSuggestions = suggestions && suggestions.length > 0;
  const isEmpty = isError || !shouldFetch || (!isLoading && !hasSuggestions);

  if (isEmpty) {
    /*
     * A failed call is treated the same as no results on purpose: suggestions
     * are a convenience, and the ticket view must never surface their failure
     * as something the reader has to act on.
     */
    return emptyMessage ? (
      <p className="text-sm text-default-400 italic">{emptyMessage}</p>
    ) : null;
  }

  return (
    <BaseCard className="mt-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon name="lamp" className="text-warning h-5 w-5" />
        <h3 className="text-sm font-semibold">
          Related Knowledge Base Articles
        </h3>
      </div>

      {isLoading ? (
        <div className="text-sm text-default-500">Loading suggestions...</div>
      ) : (
        <div className="space-y-2">
          {suggestions?.map((article: any) => (
            <Link
              key={article.id}
              to={`/knowledge-base/${article.slug}`}
              onClick={e => {
                if (onArticleClick) {
                  e.preventDefault();
                  onArticleClick(article.slug);
                }
              }}
              className="hover:bg-default-100 block rounded-lg p-3 transition-colors"
            >
              <div className="flex items-start gap-2">
                <Icon
                  name="doc"
                  className="text-primary mt-0.5 h-4 w-4 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-foreground line-clamp-1 text-sm font-medium">
                    {article.title}
                  </h4>
                  {article.excerpt && (
                    <p className="mt-1 line-clamp-2 text-xs text-default-600">
                      {article.excerpt}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs text-default-500">
                    {article.categoryName && (
                      <span>{article.categoryName}</span>
                    )}
                    {/*
                      Only shown when there is a score worth stating. The
                      unranked substring fallback sends null, and anything that
                      rounds to 0% is a worse claim than saying nothing: it
                      reads as "this article is irrelevant" on a list the search
                      just returned as relevant.
                    */}
                    {matchPercent(article.relevanceScore) !== null && (
                      <span className="text-primary">
                        {matchPercent(article.relevanceScore)}% match
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="border-divider mt-3 border-t pt-3 text-xs text-default-500">
        These articles might help solve your issue before creating a ticket.
      </div>
    </BaseCard>
  );
};
