/**
 * Principal approvals page — /principal/[principalId]/approvals
 *
 * Admin-only. Backend endpoint /v1/principals/{id}/approvals is not yet in the
 * generated client (pending a future backend PR). Placeholder until the API lands.
 * REVIEW: Wire up when PrincipalApprovalsApi is added to @brainforgeau/helpdesk-client.
 */

import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useParams } from '@modern-js/runtime/router';

function PrincipalApprovalsPage() {
  const { principalId } = useParams<{ principalId: string }>();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Approvals</h1>
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded border border-dashed text-center text-muted-foreground">
        <p className="font-medium">Approval workflows coming soon</p>
        <p className="text-sm">
          Principal-scoped approvals for principal <span className="font-mono">{principalId?.substring(0, 8)}</span>
        </p>
      </div>
    </div>
  );
}

export default withAuthenticationRequired(PrincipalApprovalsPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
