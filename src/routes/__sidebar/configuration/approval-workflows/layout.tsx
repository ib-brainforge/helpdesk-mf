import { FeatureOutlet } from '@/components/shared';
import { APPROVALS_ENABLED } from '@/constants/features';

/** Approvals are switched off (APPROVALS_ENABLED), so the URL opens Tickets. */
export default function ApprovalWorkflowsLayout() {
  return <FeatureOutlet enabled={APPROVALS_ENABLED} fallback="/tickets" />;
}
