import { FeatureOutlet } from '@/components/shared';
import { APPROVALS_ENABLED } from '@/constants/features';
import { useParams } from '@modern-js/runtime/router';

/**
 * Approvals are switched off (APPROVALS_ENABLED), so the URL opens this
 * principal's tickets.
 */
export default function PrincipalApprovalsLayout() {
  const { principalId } = useParams<{ principalId: string }>();
  return (
    <FeatureOutlet
      enabled={APPROVALS_ENABLED}
      fallback={`/principal/${principalId}/tickets`}
    />
  );
}
