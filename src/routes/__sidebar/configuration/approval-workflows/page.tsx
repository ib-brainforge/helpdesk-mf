/**
 * Approval Workflows list — /__sidebar/configuration/approval-workflows
 *
 * REVIEW: The generated ApprovalWorkflowsApi only exposes
 * `v1ApprovalWorkflowsPost` (create) for tenant-scoped workflows — there is
 * no backend GET list, detail, PUT, or DELETE endpoint yet (only the
 * multitenant-admin PrincipalApprovalsApi, keyed by principalId, has full
 * CRUD — see src/hooks/usePrincipalApprovalWorkflows.ts). Until the backend
 * adds tenant-scoped list/detail/update/delete endpoints, this page can only
 * offer creation; existing workflows cannot be listed, edited, or deleted
 * from here.
 */

import { BaseButton, Icon } from '@brainforgeau/components';
import { EmptyState, PageHeader } from '@brainforgeau/components/page';
import { withAuthorizationRequired } from '@brainforgeau/security';
import { useNavigate } from '@modern-js/runtime/router';

function ApprovalWorkflowsPage() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        title="Approval Workflows"
        breadcrumbsKey="configuration.approval-workflows.list"
      >
        <PageHeader.Actions>
          <BaseButton
            color="primary"
            icon={<Icon name="plus" className="h-3.5 w-3.5" />}
            onPress={() => navigate('/configuration/approval-workflows/new')}
          >
            Approval Workflow
          </BaseButton>
        </PageHeader.Actions>
      </PageHeader>
      <EmptyState
        title="Workflow list not yet available"
        description="Creating approval workflows is supported, but listing, editing, and deleting existing workflows requires a backend endpoint that hasn't shipped yet."
        action={
          <BaseButton
            color="primary"
            onPress={() => navigate('/configuration/approval-workflows/new')}
          >
            Create Approval Workflow
          </BaseButton>
        }
        size="lg"
      />
    </>
  );
}

export default withAuthorizationRequired(ApprovalWorkflowsPage, {
  requiredPermissions: ['Helpdesk.Settings.Manage'],
});
