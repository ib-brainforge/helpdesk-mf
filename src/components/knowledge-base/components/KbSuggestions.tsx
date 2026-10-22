import { BaseCard } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import type { HelpdeskApplicationKnowledgeBaseModelsKbArticleSuggestionDto } from '@brainforgeau/helpdesk-client';
import { Link } from '@modern-js/runtime/router';
import type { FC } from 'react';
import { useSimilarArticles } from '../hooks/useKnowledgeBase';

/**
 * A suggestion as the backend sends it. relevanceScore is 0 to 1, or null
 * when the search tier that found it does not rank (the substring
 * fallback); the generated client still types it as a number.
 */
type Suggestion = Omit<
  HelpdeskApplicationKnowledgeBaseModelsKbArticleSuggestionDto,
  'relevanceScore'
> & { relevanceScore?: number | null };

/** At or above this, a suggestion is a strong match. */
const STRONG_MATCH = 0.7;

/**
 * "Strong match" or "Possible match". A percentage claimed more precision
 * than the ranking has, and an unranked result is still one the search
 * chose, so it is a possible match rather than nothing.
 */
const matchLabel = (score: number | null | undefined) =>
  typeof score === 'number' && score >= STRONG_MATCH
    ? { text: 'Strong match', className: 'text-primary font-medium' }
    : { text: 'Possible match', className: 'text-default-500' };

interface KbSuggestionsProps {
  searchText: string;
  minChars?: number;
  limit?: number;
  onArticleClick?: (slug: string) => void;
  /** Around the panel, e.g. a divider from what is above it. */
  className?: string;
}

/**
 * Knowledge base articles like the text. The whole panel, heading included,
 * appears only once there are suggestions: while loading, with none, or
 * when the call fails there is nothing to read, so nothing is shown (a
 * failure is not something the reader has to act on).
 */
export const KbSuggestions: FC<KbSuggestionsProps> = ({
  searchText,
  minChars = 3,
  limit = 5,
  onArticleClick,
  className,
}) => {
  const shouldFetch = searchText.length >= minChars;
  const { data } = useSimilarArticles(shouldFetch ? searchText : '', limit);
  const suggestions = (shouldFetch ? (data ?? []) : []) as Suggestion[];
  if (suggestions.length === 0) return null;

  return (
    <section className={className} aria-labelledby="kb-suggestions-title">
      <BaseCard>
        <div className="mb-3 flex items-center gap-2">
          <Icon name="lamp" className="text-warning h-5 w-5" />
          <h3 id="kb-suggestions-title" className="text-sm font-semibold">
            Suggested knowledge base articles
          </h3>
        </div>
        <div className="space-y-2">
          {suggestions.map(article => {
            const match = matchLabel(article.relevanceScore);
            return (
              <Link
                key={article.id}
                to={`/knowledge-base/${article.slug}`}
                onClick={e => {
                  if (onArticleClick && article.slug) {
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
                      <span className={match.className}>{match.text}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </BaseCard>
    </section>
  );
};
