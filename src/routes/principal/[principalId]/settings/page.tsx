/**
 * Principal settings page — /principal/[principalId]/settings
 *
 * Admin-only. Minimal placeholder for now.
 * REVIEW: Add principal-level helpdesk settings (auto-close, email routing, etc.) in a future PR.
 */

import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useParams } from '@modern-js/runtime/router';

function PrincipalSettingsPage() {
  const { principalId } = useParams<{ principalId: string }>();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded border border-dashed text-center text-muted-foreground">
        <p className="font-medium">Principal settings coming soon</p>
        <p className="text-sm">
          Configuration for principal <span className="font-mono">{principalId?.substring(0, 8)}</span>
        </p>
      </div>
    </div>
  );
}

export default withAuthenticationRequired(PrincipalSettingsPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
