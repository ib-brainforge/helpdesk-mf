/**
 * Principal SLA policies page — /principal/[principalId]/sla-policies
 *
 * Admin-only. Backend endpoint /v1/principals/{id}/sla-policies is not yet in the
 * generated client (pending a future backend PR). Placeholder until the API lands.
 * REVIEW: Wire up when PrincipalSlaPoliciesApi is added to @brainforgeau/helpdesk-client.
 */

import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useParams } from '@modern-js/runtime/router';

function PrincipalSlaPoliciesPage() {
  const { principalId } = useParams<{ principalId: string }>();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">SLA Policies</h1>
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded border border-dashed text-center text-muted-foreground">
        <p className="font-medium">SLA policy management coming soon</p>
        <p className="text-sm">
          Principal-scoped SLA policies for principal <span className="font-mono">{principalId?.substring(0, 8)}</span>
        </p>
      </div>
    </div>
  );
}

export default withAuthenticationRequired(PrincipalSlaPoliciesPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
