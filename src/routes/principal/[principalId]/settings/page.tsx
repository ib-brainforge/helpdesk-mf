/**
 * Principal settings page — /principal/[principalId]/settings
 *
 * Admin-only. Structured shell for principal account settings.
 * Currently shows stub data with "Demo data" indicators — real data requires
 * IAppContext.PrincipalId integration which is pending.
 * REVIEW: Replace stub cards with real API data when principal context lands in IAppContext.
 */

import { usePrincipal } from '@/hooks/usePrincipal';
import { PageSpinner } from '@brainforgeau/components';
import { Box } from '@brainforgeau/components/base';
import {
  PageBody,
  PageHeader,
  PendingCrumb,
} from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { Chip } from '@heroui/react';
import { useParams } from '@modern-js/runtime/router';

function SettingsCard({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Chip size="sm" color="warning">
            Demo data
          </Chip>
        </div>
        {children}
      </div>
    </Box>
  );
}

function PrincipalSettingsPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const shortId = principalId?.substring(0, 8) ?? '—';
  const { data: principal } = usePrincipal(principalId);

  return (
    <PageBody>
      <PageHeader
        title="Principal Account Settings"
        breadcrumbsKey="principal.settings"
        breadcrumbsParams={{
          principalId: principalId!,
          principalName: principal?.name ?? PendingCrumb,
        }}
      >
        <PageHeader.Meta>
          Settings for principal <span className="font-mono">{shortId}</span>
        </PageHeader.Meta>
      </PageHeader>

      <div className="flex flex-col gap-6">
        {/* Account Info */}
        <SettingsCard title="Account Information">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-default-400 text-xs uppercase tracking-wide mb-1">
                Principal Name
              </p>
              <p className="font-medium">Acme Corp (stub)</p>
            </div>
            <div>
              <p className="text-default-400 text-xs uppercase tracking-wide mb-1">
                Principal ID
              </p>
              <p className="font-mono text-xs">{principalId ?? '—'}</p>
            </div>
            <div>
              <p className="text-default-400 text-xs uppercase tracking-wide mb-1">
                Contact Email
              </p>
              <p className="font-medium">admin@acmecorp.example (stub)</p>
            </div>
            <div>
              <p className="text-default-400 text-xs uppercase tracking-wide mb-1">
                Account Status
              </p>
              <Chip size="sm" color="success">
                Active (stub)
              </Chip>
            </div>
          </div>
          <p className="text-xs text-default-400 mt-2">
            Coming when principal account integration completes.
          </p>
        </SettingsCard>

        {/* Subscription Tier */}
        <SettingsCard title="Subscription Tier">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-default-400 text-xs uppercase tracking-wide mb-1">
                Current Plan
              </p>
              <Chip size="sm" color="accent">
                Professional (stub)
              </Chip>
            </div>
            <div>
              <p className="text-default-400 text-xs uppercase tracking-wide mb-1">
                Renewal Date
              </p>
              <p className="font-medium">2027-01-01 (stub)</p>
            </div>
          </div>
          <p className="text-xs text-default-400 mt-2">
            Coming when principal account integration completes.
          </p>
        </SettingsCard>

        {/* Tenants Under Principal */}
        <SettingsCard title="Tenants">
          <div className="flex flex-col items-center justify-center py-6 text-center text-default-500 gap-2">
            <p className="text-sm">
              No tenants loaded — principal context pending.
            </p>
            <p className="text-xs">
              This list will show all tenants linked to this principal account.
            </p>
          </div>
          <p className="text-xs text-default-400">
            Coming when principal account integration completes.
          </p>
        </SettingsCard>

        {/* Billing Summary */}
        <SettingsCard title="Billing">
          <p className="text-sm text-default-500">
            Full billing details are managed in the billing portal.
          </p>
          <p className="text-xs text-default-400">
            Billing page link will be available when billing integration
            completes.
          </p>
        </SettingsCard>
      </div>
    </PageBody>
  );
}

export default withAuthenticationRequired(PrincipalSettingsPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
