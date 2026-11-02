import { AppAuthSplash } from '@/components/AppSplash';
import { TicketDetail } from '@/components/tickets';
import { RaisedTicketDetail } from '@/components/tickets/components/RaisedTicketDetail';
import {
  isHandledAboveSearch,
  ticketPageFor,
} from '@/components/tickets/handled-above';
import { useTicketDetail } from '@/components/tickets/hooks/useTickets';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useParams, useSearchParams } from '@modern-js/runtime/router';

/**
 * One page for every ticket in the one list. A ticket the tenant raised that
 * a helpdesk above it works lives in that tenant, so it is shown as the
 * office's read-only projection. Links from the list and the wizard mark such
 * a ticket (?handledBy=above); a link without the mark (an old bookmark)
 * finds out from the tenant's own lookup answering 404. The lookup shares
 * TicketDetail's query, so an own ticket is fetched once.
 */
function TicketDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const markedAbove = isHandledAboveSearch(search);
  const own = useTicketDetail(markedAbove ? '' : id);

  if (ticketPageFor(markedAbove, own.error) === 'raised-above') {
    return <RaisedTicketDetail ticketId={id} />;
  }
  return <TicketDetail />;
}

export default withAuthenticationRequired(TicketDetailPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
