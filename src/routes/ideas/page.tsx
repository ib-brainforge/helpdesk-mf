/**
 * Ideas Forum page — /ideas
 *
 * Shows a paginated list of tickets published to the Ideas Forum.
 * Vote counts are placeholders (always 0) — voting is out of scope for Wave 6.
 * REVIEW: Add voting + commenting in a future wave when the backend endpoints exist.
 */

import { PageSpinner } from '@brainforgeau/components';
import { Box } from '@brainforgeau/components/base';
import { formatDateTime } from '@brainforgeau/components/utils';
import { withAuthenticationRequired, useTimezone } from '@brainforgeau/security';
import { Button, Pagination } from '@heroui/react';
import { useState } from 'react';
import { useNavigate } from '@modern-js/runtime/router';
import type { IdeaListItem } from '@/components/tickets/hooks/useTickets';
import { useIdeasForum } from '@/components/tickets/hooks/useTickets';

const PAGE_SIZE = 20;

function IdeasForumPage() {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const timezone = useTimezone();
  const { data, isLoading } = useIdeasForum(page, PAGE_SIZE);

  const ideas: IdeaListItem[] = data?.items ?? [];
  const totalPages = Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ideas Forum</h1>
          <p className="text-sm text-default-500 mt-1">
            Tickets published as ideas — {data?.totalCount ?? 0} total
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <PageSpinner title="Loading ideas..." />
        </div>
      ) : ideas.length === 0 ? (
        <Box>
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center text-default-500">
            <p className="text-lg font-medium">No ideas yet</p>
            <p className="text-sm">
              Agents can publish tickets to the Ideas Forum from the ticket detail page.
            </p>
          </div>
        </Box>
      ) : (
        <div className="flex flex-col gap-4">
          {ideas.map((idea) => (
            <Box key={idea.id}>
              <div className="flex flex-col gap-2 p-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      className="text-left hover:underline font-semibold text-primary cursor-pointer"
                      onClick={() => navigate(`/tickets/${idea.id}`)}
                    >
                      {idea.subject}
                    </button>
                    {idea.description && (
                      <p className="text-sm text-default-600 mt-1 line-clamp-2">
                        {idea.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-default-400">
                      {/* REVIEW: Vote count is always 0 — voting not yet implemented */}
                      {idea.voteCount} votes
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-default-400">
                  <span>By {idea.submitterEmail}</span>
                  <span>•</span>
                  <span>Published {formatDateTime(idea.publishedAt, { timezone })}</span>
                </div>
              </div>
            </Box>
          ))}

          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <Pagination
                total={totalPages}
                page={page}
                onChange={setPage}
                showControls
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default withAuthenticationRequired(IdeasForumPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
