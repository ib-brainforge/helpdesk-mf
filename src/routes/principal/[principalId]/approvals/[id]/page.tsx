/**
 * Principal approval workflow edit page — /principal/[principalId]/approvals/[id]
 */

import {
  usePrincipalApprovalWorkflow,
  useUpdatePrincipalApprovalWorkflow,
} from '@/hooks/usePrincipalApprovalWorkflows';
import {
  BaseButton,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  PageSpinner,
} from '@brainforgeau/components';
import { HelpdeskDomainApprovalsEnumsApprovalMode } from '@brainforgeau/helpdesk-client';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { addToast } from '@heroui/react';
import {
  useNavigate,
  useOutletContext,
  useParams,
} from '@modern-js/runtime/router';
import { useCallback, useEffect, useState } from 'react';
import type { PrincipalOutletContext } from '../../layout';

const APPROVAL_MODE_LABELS: Record<string, string> = {
  Sequential: 'Sequential',
  Parallel: 'Parallel',
  AnyOne: 'Any one approver',
};

function PrincipalApprovalWorkflowEditPage() {
  const { principalId, id } = useParams<{ principalId: string; id: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();

  const { data: workflow, isLoading } = usePrincipalApprovalWorkflow(
    principalId ?? '',
    id ?? '',
  );
  const updateMutation = useUpdatePrincipalApprovalWorkflow(principalId ?? '');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [approvalMode, setApprovalMode] = useState<string>(
    HelpdeskDomainApprovalsEnumsApprovalMode.Sequential,
  );
  const [isActive, setIsActive] = useState(true);
  const [triggerOnCreation, setTriggerOnCreation] = useState(false);
  const [triggerOnStatusChange, setTriggerOnStatusChange] = useState(false);

  useEffect(() => {
    if (workflow) {
      setName(workflow.name ?? '');
      setDescription(workflow.description ?? '');
      setApprovalMode(
        workflow.approvalMode ??
          HelpdeskDomainApprovalsEnumsApprovalMode.Sequential,
      );
      setIsActive(workflow.isActive ?? true);
      setTriggerOnCreation(workflow.triggerOnCreation ?? false);
      setTriggerOnStatusChange(workflow.triggerOnStatusChange ?? false);
    }
  }, [workflow]);

  if (context?.level !== 'admin') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-xl font-semibold">Access Denied</p>
        <p className="text-default-500 text-sm">
          Approval workflow management requires admin access.
        </p>
      </div>
    );
  }

  const handleSave = useCallback(() => {
    if (!id || !name.trim()) return;
    updateMutation.mutate(
      {
        id,
        command: {
          name: name.trim(),
          description: description.trim() || null,
          approvalMode:
            approvalMode as HelpdeskDomainApprovalsEnumsApprovalMode,
          isActive,
          triggerOnCreation,
          triggerOnStatusChange,
          steps: workflow?.steps ?? [],
        },
      },
      {
        onSuccess: () => {
          addToast({ title: 'Approval workflow updated', severity: 'success' });
          navigate(`/principal/${principalId}/approvals`);
        },
      },
    );
  }, [
    id,
    name,
    description,
    approvalMode,
    isActive,
    triggerOnCreation,
    triggerOnStatusChange,
    workflow,
    updateMutation,
    navigate,
    principalId,
  ]);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <PageSpinner title="Loading approval workflow..." />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-xl font-semibold">Not Found</p>
        <BaseButton
          variant="light"
          onPress={() => navigate(`/principal/${principalId}/approvals`)}
        >
          Back to Approvals
        </BaseButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div className="flex items-center gap-3">
        <BaseButton
          variant="light"
          onPress={() => navigate(`/principal/${principalId}/approvals`)}
        >
          Back
        </BaseButton>
        <h1 className="text-2xl font-semibold">Edit Approval Workflow</h1>
      </div>

      <div className="flex flex-col gap-4">
        <BaseInput
          label="Name"
          value={name}
          onValueChange={setName}
          isRequired
        />
        <BaseInput
          label="Description"
          value={description}
          onValueChange={setDescription}
        />
        <BaseSelect
          label="Approval mode"
          selectedKeys={[approvalMode]}
          onSelectionChange={keys => {
            const val = Array.from(keys)[0];
            if (val) setApprovalMode(String(val));
          }}
        >
          {Object.entries(APPROVAL_MODE_LABELS).map(([value, label]) => (
            <BaseSelectItem key={value}>{label}</BaseSelectItem>
          ))}
        </BaseSelect>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={triggerOnCreation}
              onChange={e => setTriggerOnCreation(e.target.checked)}
              className="h-4 w-4"
            />
            Trigger on ticket creation
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={triggerOnStatusChange}
              onChange={e => setTriggerOnStatusChange(e.target.checked)}
              className="h-4 w-4"
            />
            Trigger on status change
          </label>
        </div>
        {(workflow.steps?.length ?? 0) > 0 && (
          <div className="rounded border p-3 text-sm text-default-500">
            {workflow.steps?.length} step(s) configured. Step editor coming in a
            follow-up iteration.
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <BaseButton
          color="primary"
          onPress={handleSave}
          isLoading={updateMutation.isPending}
          isDisabled={!name.trim()}
        >
          Save changes
        </BaseButton>
        <BaseButton
          variant="light"
          onPress={() => navigate(`/principal/${principalId}/approvals`)}
        >
          Cancel
        </BaseButton>
      </div>
    </div>
  );
}

export default withAuthenticationRequired(PrincipalApprovalWorkflowEditPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
