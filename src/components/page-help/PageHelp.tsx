import { KbOwnerBadge } from '@/components/knowledge-base/components/KbOwnerBadge';
import { BaseSideDrawer, Icon } from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import type { HelpdeskApplicationHelpWhatsNewEntryDto } from '@brainforgeau/helpdesk-client';
import { useMatches } from '@modern-js/runtime/router';
import DOMPurify from 'dompurify';
import { type FC, useState } from 'react';
import { pageKeyForRouteId } from './pageKey';
import {
  useMarkWhatsNewRead,
  usePageHelp,
  useWhatsNew,
  useWhatsNewUnreadCount,
} from './usePageHelp';

/** An article title that opens to its body. */
const HelpEntry: FC<{
  article: { isInherited?: boolean; ownerTenantId?: string };
  title?: string;
  excerpt?: string | null;
  body?: string;
  unread?: boolean;
  onOpen?: () => void;
}> = ({ article, title, excerpt, body, unread, onOpen }) => (
  <details
    className="border-light group rounded-lg border p-3"
    onToggle={e => {
      if ((e.currentTarget as HTMLDetailsElement).open) onOpen?.();
    }}
  >
    <summary className="flex cursor-pointer list-none items-start gap-2">
      {unread && (
        <span
          className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full"
          aria-label="Unread"
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block empty:hidden">
          <KbOwnerBadge article={article} />
        </span>
        {excerpt && (
          <span className="text-default-500 block text-sm group-open:hidden">
            {excerpt}
          </span>
        )}
      </span>
    </summary>
    <div
      className="prose dark:prose-invert mt-3 max-w-none text-sm"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitised article HTML, as on the article page
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body ?? '') }}
    />
  </details>
);

/**
 * "Help": the help articles tagged for the page in view, and What's new, in a
 * side drawer. The button carries the user's unread What's new count. Both
 * read v1/help, which needs a signed-in user and no helpdesk permission, and
 * include what the offices above share down to this tenant.
 */
export const PageHelp: FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const matches = useMatches();
  const routeId = matches.at(-1)?.id ?? '';
  const pageKey = pageKeyForRouteId(routeId);

  const { data: unreadCount = 0 } = useWhatsNewUnreadCount();
  const { data: pageHelp, isLoading: loadingHelp } = usePageHelp(
    pageKey,
    isOpen && !!routeId,
  );
  const { data: whatsNew, isLoading: loadingNews } = useWhatsNew(isOpen);
  const markRead = useMarkWhatsNewRead();

  const openEntry = (
    entry: HelpdeskApplicationHelpWhatsNewEntryDto & { id: string },
  ) => {
    if (!entry.isRead && !markRead.isPending) markRead.mutate(entry.id);
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-30">
        <BaseButton
          color="light"
          variant="bordered"
          size="sm"
          onPress={() => setIsOpen(true)}
          icon={<Icon name="question-o" className="h-4 w-4" />}
          data-testid="page-help-open"
          aria-label={
            unreadCount > 0
              ? `Help, ${unreadCount} unread in What's new`
              : 'Help'
          }
        >
          Help
          {unreadCount > 0 && (
            <span
              className="bg-primary ml-1 rounded-full px-1.5 text-xs text-white"
              data-testid="whats-new-unread-count"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </BaseButton>
      </div>

      <BaseSideDrawer isOpen={isOpen} onOpenChange={setIsOpen} title="Help">
        <div className="space-y-6 pb-6">
          <section>
            <h3 className="mb-2 font-semibold">Help for this page</h3>
            {loadingHelp ? (
              <p className="text-default-500 text-sm">Loading…</p>
            ) : pageHelp && pageHelp.length > 0 ? (
              <div className="space-y-2">
                {pageHelp.map(article => (
                  <HelpEntry
                    key={article.id}
                    article={article}
                    title={article.title}
                    excerpt={article.excerpt}
                    body={article.body}
                  />
                ))}
              </div>
            ) : (
              <p className="text-default-500 text-sm">
                No help has been written for this page yet.
              </p>
            )}
          </section>

          <section>
            <h3 className="mb-2 font-semibold">What's new</h3>
            {loadingNews ? (
              <p className="text-default-500 text-sm">Loading…</p>
            ) : whatsNew && whatsNew.length > 0 ? (
              <div className="space-y-2">
                {whatsNew.map(entry => (
                  <HelpEntry
                    key={entry.id}
                    article={entry}
                    title={entry.title}
                    excerpt={entry.excerpt}
                    body={entry.body}
                    unread={!entry.isRead}
                    onOpen={() => openEntry(entry)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-default-500 text-sm">Nothing new yet.</p>
            )}
          </section>
        </div>
      </BaseSideDrawer>
    </>
  );
};
