import { useCallback } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { useNavigate, useParams } from '@modern-js/runtime/router';
import { BaseButton, Icon } from '@brainforgeau/components';
import {
  ApprovalWorkflowForm,
  useApprovalWorkflow,
  useUpdateApprovalWorkflow,
} from '@/components/approvals';

// REVIEW: Following existing pattern from automation rule editing

function EditApprovalWorkflowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: workflow, isLoading } = useApprovalWorkflow(id);
  const updateMutation = useUpdateApprovalWorkflow();

  const handleSubmit = useCallback(
    (data: any) => {
      if (!id) return;
      updateMutation.mutate(
        { id, command: data },
        {
          onSuccess: () => {
            navigate('/configuration/approval-workflows');
          },
        }
      );
    },
    [id, updateMutation, navigate]
  );

  const handleCancel = useCallback(() => {
    navigate('/configuration/approval-workflows');
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Icon name="exclamation-triangle" className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Workflow Not Found</h2>
          <p className="text-gray-600 mb-4">The workflow you are looking for does not exist.</p>
          <BaseButton onPress={() => navigate('/configuration/approval-workflows')}>
            Back to Workflows
          </BaseButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Edit Approval Workflow - Configuration</title>
      </Helmet>

      <div className="mb-6">
        <BaseButton
          variant="link"
          onPress={() => navigate('/configuration/approval-workflows')}
          icon={<Icon name="arrow-left" className="h-4 w-4" />}
        >
          Back to Workflows
        </BaseButton>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Edit Approval Workflow</h1>
        <p className="text-sm text-gray-600">
          Modify the approval workflow configuration.
        </p>
      </div>

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
        onCancel={handleCancel}
        isSubmitting={updateMutation.isPending}
      />
    </>
  );
}

export default EditApprovalWorkflowPage;
