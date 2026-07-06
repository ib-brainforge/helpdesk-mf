/**
 * Configuration approval workflow detail page —
 * /__sidebar/configuration/approval-workflows/[id]
 *
 * REVIEW: The generated ApprovalWorkflowsApi only exposes
 * `v1ApprovalWorkflowsPost` (create) for tenant-scoped workflows — there is
 * no backend GET-by-id or PUT endpoint yet (only the multitenant-admin
 * PrincipalApprovalsApi, keyed by principalId, supports fetching/updating a
 * single workflow — see src/hooks/usePrincipalApprovalWorkflows.ts). This
 * page cannot load or edit an existing tenant-scoped workflow until the
 * backend adds those endpoints.
 */

import { EmptyState, PageHeader } from '@brainforgeau/components/page';
import { withAuthorizationRequired } from '@brainforgeau/security';
import { useParams } from '@modern-js/runtime/router';

function EditApprovalWorkflowPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <>
      <PageHeader
        title="Approval Workflow"
        breadcrumbsKey="configuration.approval-workflows.detail"
        breadcrumbsParams={{ id: id!, name: id! }}
      />
      <EmptyState
        title="Workflow detail not yet available"
        description="Viewing and editing an existing approval workflow requires a backend endpoint that hasn't shipped yet. Approval workflows can currently only be created."
        size="lg"
      />
    </>
  );
}

export default withAuthorizationRequired(EditApprovalWorkflowPage, {
  requiredPermissions: ['Helpdesk.Settings.Manage'],
});
