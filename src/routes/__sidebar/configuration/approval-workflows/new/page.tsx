import { useCallback } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { useNavigate } from '@modern-js/runtime/router';
import { BaseButton, Icon } from '@brainforgeau/components';
import { ApprovalWorkflowForm, useCreateApprovalWorkflow } from '@/components/approvals';

// REVIEW: Following existing pattern from automation rule creation

function NewApprovalWorkflowPage() {
  const navigate = useNavigate();
  const createMutation = useCreateApprovalWorkflow();

  const handleSubmit = useCallback(
    (data: any) => {
      createMutation.mutate(data, {
        onSuccess: () => {
          navigate('/configuration/approval-workflows');
        },
      });
    },
    [createMutation, navigate]
  );

  const handleCancel = useCallback(() => {
    navigate('/configuration/approval-workflows');
  }, [navigate]);

  return (
    <>
      <Helmet>
        <title>New Approval Workflow - Configuration</title>
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
        <h1 className="text-2xl font-semibold mb-2">Create Approval Workflow</h1>
        <p className="text-sm text-gray-600">
          Configure a new approval workflow for tickets requiring approval.
        </p>
      </div>

      <ApprovalWorkflowForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={createMutation.isPending}
      />
    </>
  );
}

export default NewApprovalWorkflowPage;
