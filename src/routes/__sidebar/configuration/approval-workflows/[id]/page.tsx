/**
 * Configuration approval workflow detail page —
 * /__sidebar/configuration/approval-workflows/[id]
 *
 * W1-P7: Migrated to <DetailPage> for breadcrumbs + ?tab= URL sync.
 *
 * REVIEW: ApprovalWorkflowForm is a self-contained useState-based component
 * that owns its own Save/Cancel buttons. In a follow-up PR, refactor
 * ApprovalWorkflowForm to expose a form ref + submit handler so it can be
 * wired to useEntityForm and formActions in the DetailPage.Tab header slot.
 * For now, Save/Cancel remain inside the component (not in PageHeader.Actions).
 */

import {
  ApprovalWorkflowForm,
  useApprovalWorkflow,
  useUpdateApprovalWorkflow,
} from '@/components/approvals';
import { useTabSearchParam } from '@/hooks/useTabSearchParam';
import { PageSpinner } from '@brainforgeau/components';
import {
  DetailPage,
  PendingCrumb,
  useDetailTabState,
} from '@brainforgeau/components/page';
import { useParams } from '@modern-js/runtime/router';
import { useCallback } from 'react';

function EditApprovalWorkflowPage() {
  const { id } = useParams<{ id: string }>();
  const { data: workflow, isLoading } = useApprovalWorkflow(id);
  const updateMutation = useUpdateApprovalWorkflow();

  const { getParam, setParam } = useTabSearchParam();
  const { activeTab, setActiveTab } = useDetailTabState({
    defaultTab: 'details',
    getParam,
    setParam,
  });

  // REVIEW: navigate-on-success is handled inside ApprovalWorkflowForm
  const handleSubmit = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: any) => {
      if (!id) return;
      updateMutation.mutate({ id, command: data });
    },
    [id, updateMutation],
  );

  if (isLoading || !workflow) {
    return <PageSpinner title="Loading approval workflow..." />;
  }

  return (
    <DetailPage
      title={workflow.name || 'Approval Workflow'}
      breadcrumbsKey="configuration.approval-workflows.detail"
      breadcrumbsParams={{
        id: id!,
        name: workflow.name ?? PendingCrumb,
      }}
      documentTitle={
        workflow.name ? `Approval Workflow: ${workflow.name}` : undefined
      }
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/*
       * REVIEW: No formActions here — ApprovalWorkflowForm owns Save/Cancel.
       * Pending refactor to useEntityForm (see file-level REVIEW above).
       */}
      <DetailPage.Tab id="details" title="Details">
        <ApprovalWorkflowForm
          initialData={{
            name: workflow.name,
            description: workflow.description,
            categoryId: workflow.categoryId,
            approvalMode: workflow.approvalMode,
            isActive: workflow.isActive,
            triggerOnCreation: workflow.triggerOnCreation,
            steps: workflow.steps,
          }}
          onSubmit={handleSubmit}
          onCancel={() => undefined}
          isSubmitting={updateMutation.isPending}
        />
      </DetailPage.Tab>
    </DetailPage>
  );
}

export default EditApprovalWorkflowPage;
