/**
 * Principal reports page — /principal/[principalId]/reports
 *
 * Available to both admin and agent roles.
 * Shows ticket volume metrics for this principal.
 *
 * Backend endpoint /v1/principals/{id}/reports/ticket-volume is not yet in the
 * generated client (pending a future backend PR). Shows a summary from the
 * existing ticket list as a fallback until the dedicated reports endpoint lands.
 * REVIEW: Replace with PrincipalReportsApi.getTicketVolume once API is published.
 */

import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useParams } from '@modern-js/runtime/router';
import { usePrincipalTickets } from '@/hooks/usePrincipalTickets';

function PrincipalReportsPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const { totalCount, isLoading } = usePrincipalTickets(principalId ?? '', undefined);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Reports</h1>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <PageSpinner title="Loading..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-5 flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Total Tickets</span>
            <span className="text-3xl font-bold">{totalCount}</span>
          </div>
          <div className="rounded-lg border p-5 flex flex-col gap-2 col-span-2">
            <span className="text-sm font-medium">Ticket Volume Chart</span>
            <div className="flex h-28 items-center justify-center rounded border border-dashed text-muted-foreground text-sm">
              Detailed chart coming soon — requires /v1/principals/{'{id}'}/reports/ticket-volume endpoint
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuthenticationRequired(PrincipalReportsPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
